/********************************************************************************
 vCards-js, Eric J Nesser, November 2014,
 ********************************************************************************/
/*jslint node: true */
"use strict";

// vCard v2.1 (Internet Mail Consortium): https://web.archive.org/web/20150921154105/http://www.imc.org/pdi/vcard-21.rtf
// vCard v3.0 (IETF): https://datatracker.ietf.org/doc/html/rfc2426
// vCard v4.0 (IETF): https://datatracker.ietf.org/doc/html/rfc6350

/**
 * vCard formatter for formatting vCards in VCF format
 */
(function vCardFormatter()
{
	let majorVersion = 3;

	/**
	 * Escape value string
	 * @param  {String}  value  string to encode
	 * @return {String}         encoded string
	 */
	function e(value)
	{
		if (value)
		{
			if (typeof value !== "string")
				value = "" + value;

			// Normalize Unicode to NFC for consistent encoding (e.g. umlauts)
			value = value.normalize("NFC");

			return value
				.replace(/\\/g, "\\\\") // backslash must be escaped first
				.replace(/\n/g, "\\n")
				.replace(/,/g, "\\,");
		}

		return "";
	}

	/**
	 * Escape compound value string (adds semicolon escaping on top of e())
	 * @param  {String}  value  string to encode
	 * @return {String}         encoded string
	 */
	function ec(value)
	{
		return value ? e(value).replace(/;/g, "\\;") : "";
	}

	/**
	 * Return a content-line
	 * A content-line ends with CRLF and lines are folded at 75 characters per RFC.
	 * @param  {String}          prop    vCard property name
	 * @param  {Array.<String>}  params  parameters for the property
	 * @param  {String}          value
	 * @return {String}          Formatted content-line
	 */
	function contentLine(prop, params, value)
	{
		const paramsString = params.filter(Boolean).join(";");
		let content = prop + (paramsString ? ";" + paramsString : "") + ":" + value;

		if (majorVersion < 3)
		{
			// v2.1 defines folding on whitespaces; skip RFC folding
			return content + "\r\n";
		}

		let maxLineLength = 75;
		const lines = [];
		while (content.length > maxLineLength)
		{
			lines.push(content.slice(0, maxLineLength));
			content = content.slice(maxLineLength);
			maxLineLength = 74; // account for the folding leading whitespace
		}
		lines.push(content);

		return lines.join("\r\n ") + "\r\n";
	}

	/**
	 * Generate an Apple X-ABLabel item group for custom-labeled properties.
	 * Produces two lines:  itemXXX.PROP:value  and  itemXXX.X-ABLabel:label
	 * @param  {String}  prop   The vCard property name (e.g. "TEL", "EMAIL", "URL")
	 * @param  {String}  value  Already-encoded property value
	 * @param  {String}  label  Human-readable label
	 * @return {String}
	 */
	function xAbLabelGroup(prop, value, label)
	{
		const itemId = "item" + Math.random().toString(36).substr(2, 9);
		return contentLine(itemId + "." + prop, [], value) +
		       contentLine(itemId + ".X-ABLabel", [], e(label));
	}

	/**
	 * Get formatted photo content-line
	 * @param  {String}  prop   "PHOTO" or "LOGO"
	 * @param  {object}  photo  Photo object from vCard.getPhoto()
	 * @return {String}         Formatted photo content-line
	 */
	function getPhotoContentLine(prop, photo)
	{
		const params = [];

		let imageType = photo.mediaType;
		let mediaType = imageType;
		if (imageType.includes("/"))
			imageType = imageType.split("/")[1];
		else
			mediaType = "image/" + imageType;

		if (majorVersion >= 4)
		{
			params.push("VALUE=uri");
			params.push("MEDIATYPE=" + mediaType);

			if (photo.base64)
				return contentLine(prop, params, e("data:image/png;base64," + photo.url));
		} else if (majorVersion === 3)
		{
			if (photo.base64)
				params.push("ENCODING=b");
			params.push("TYPE=" + imageType.toUpperCase());
		} else
		{
			if (photo.base64)
			{
				params.push("ENCODING=b");
				params.push("TYPE=" + imageType.toUpperCase());
			} else
			{
				params.push("VALUE=URL");
			}
		}

		return contentLine(prop, params, e(photo.url));
	}

	/**
	 * Get formatted date attribute content-line (ISO-8601 extended format)
	 * @param  {String}  prop
	 * @param  {Date}    date
	 * @return {String}        Formatted date content-line
	 */
	function getDateContentLine(prop, date)
	{
		const params = majorVersion >= 4 ? ["VALUE=date-and-or-time"] : [];

		const yyyy = "" + date.getFullYear();
		const mm = ("0" + (date.getMonth() + 1)).slice(-2);
		const dd = ("0" + date.getDate()).slice(-2);
		// ISO-8601 4.1.2.2 extended format
		const formattedDate = yyyy + "-" + mm + "-" + dd;

		return contentLine(prop, params, formattedDate);
	}

	/**
	 * Get ADR content-line
	 * @param  {"home" | "work"}  type
	 * @param  {object}           addr
	 * @param  {boolean}          isPrimary
	 * @return {String}
	 */
	function getAddressPropLine(type, addr, isPrimary)
	{
		if (isPrimary === undefined) isPrimary = false;
		const contentLines = [];

		if (addr.label || addr.street || addr.city || addr.stateProvince || addr.postalCode || addr.countryRegion)
		{
			const params = [];
			if (majorVersion >= 4)
			{
				params.push("TYPE=" + type.toUpperCase());
				if (isPrimary)
					params.push("PREF=1");
				if (addr.label)
					params.push("LABEL=\"" + e(addr.label) + "\"");
			} else if (majorVersion >= 3)
			{
				const types = [type.toUpperCase()];
				if (isPrimary) types.push("PREF");
				params.push("TYPE=" + types.join(","));

				if (addr.label)
					contentLines.push(contentLine("LABEL", params, e(addr.label)));
			} else
			{
				params.push(type.toUpperCase());
				if (isPrimary) params.push("PREF");
				params.push("CHARSET=utf-8");

				if (addr.label)
					contentLines.push(contentLine("LABEL", params, e(addr.label)));
			}

			const values = ["", "", addr.street, addr.city, addr.stateProvince, addr.postalCode, addr.countryRegion];
			contentLines.push(contentLine("ADR", params, values.map(ec).join(";")));
		}

		return contentLines.join("");
	}

	/**
	 * Get EMAIL content-line
	 * @param  {"home" | "work" | "other"}  type
	 * @param  {String}                     address
	 * @param  {boolean}                    isPrimary
	 * @return {String}
	 */
	function getEmailPropLine(type, address, isPrimary)
	{
		if (isPrimary === undefined) isPrimary = false;
		const params = [];
		if (majorVersion >= 4)
		{
			params.push("TYPE=" + type.toUpperCase());
			if (isPrimary) params.push("PREF=1");
		} else if (majorVersion >= 3)
		{
			const types = [type.toUpperCase(), "INTERNET"];
			if (isPrimary) types.push("PREF");
			params.push("TYPE=" + types.join(","));
		} else
		{
			if (type !== "other") params.push(type.toUpperCase());
			params.push("INTERNET");
			if (isPrimary) params.push("PREF");
			params.push("CHARSET=utf-8");
		}

		return contentLine("EMAIL", params, e(address));
	}

	/**
	 * Get TEL content-line
	 * @param  {"cell" | "voice" | "pager" | "fax"}  type
	 * @param  {String}                              tel
	 * @param  {"home" | "work" | undefined}         target
	 * @param  {boolean}                             isPrimary
	 * @return {String}
	 */
	function getTelPropLine(type, tel, target, isPrimary)
	{
		if (isPrimary === undefined) isPrimary = false;
		const params = [];

		if (majorVersion >= 4)
		{
			params.push(
				"TYPE=" + (target ? "\"" + target.toUpperCase() + "," + type.toUpperCase() + "\"" : type.toUpperCase())
			);
			if (isPrimary) params.push("PREF=1");
			params.push("VALUE=uri");
			return contentLine("TEL", params, "tel:" + e(tel));
		} else if (majorVersion >= 3)
		{
			const types = [type.toUpperCase()];
			if (target) types.unshift(target.toUpperCase());
			if (isPrimary) types.push("PREF");
			params.push("TYPE=" + types.join(","));
			return contentLine("TEL", params, e(tel));
		} else
		{
			params.push(type.toUpperCase());
			if (target) params.unshift(target.toUpperCase());
			if (isPrimary) params.push("PREF");
			return contentLine("TEL", params, e(tel));
		}
	}

	module.exports = {
		/**
		 * Get formatted vCard in VCF format
		 * @param  {object}  vCard object
		 * @return {String}  Formatted vCard in VCF format
		 */
		getFormattedString: function(vCard)
		{
			majorVersion = vCard.getMajorVersion();

			let formattedVCardString = "";
			formattedVCardString += contentLine("BEGIN", [], "VCARD");
			formattedVCardString += contentLine("VERSION", [], vCard.version);

			// CHARSET param dropped in v3+ (declared in MIME Content-Type instead)
			const params = majorVersion >= 3 ? [] : ["CHARSET=utf-8"];

			let formattedName = vCard.formattedName;
			if (!formattedName)
				formattedName = [vCard.firstName, vCard.middleName, vCard.lastName].filter(Boolean).join(" ");
			formattedVCardString += contentLine("FN", params, e(formattedName));

			const nameParts = [vCard.lastName, vCard.firstName, vCard.middleName, vCard.namePrefix, vCard.nameSuffix];
			formattedVCardString += contentLine("N", params, nameParts.map(ec).join(";"));

			if (vCard.nickname && majorVersion >= 3)
				formattedVCardString += contentLine("NICKNAME", params, e(vCard.nickname));

			if (vCard.gender && majorVersion >= 4)
				formattedVCardString += contentLine("GENDER", params, e(vCard.gender));

			if (vCard.uid)
				formattedVCardString += contentLine("UID", params, e(vCard.uid));

			if (vCard.birthday)
				formattedVCardString += getDateContentLine("BDAY", vCard.birthday);

			if (vCard.anniversary && majorVersion >= 4)
				formattedVCardString += getDateContentLine("ANNIVERSARY", vCard.anniversary);

			if (vCard.email)
			{
				if (!Array.isArray(vCard.email))
					vCard.email = [vCard.email];
				vCard.email.forEach(function(address) {
					formattedVCardString += getEmailPropLine("home", address);
				});
			}

			if (vCard.workEmail)
			{
				if (!Array.isArray(vCard.workEmail))
					vCard.workEmail = [vCard.workEmail];
				vCard.workEmail.forEach(function(address) {
					formattedVCardString += getEmailPropLine("work", address);
				});
			}

			if (vCard.otherEmail)
			{
				if (!Array.isArray(vCard.otherEmail))
					vCard.otherEmail = [vCard.otherEmail];
				vCard.otherEmail.forEach(function(address) {
					formattedVCardString += getEmailPropLine("other", address);
				});
			}

			// Labeled emails with Apple X-ABLabel grouping
			if (vCard.labeledEmails && vCard.labeledEmails.length)
			{
				vCard.labeledEmails.forEach(function(entry) {
					const address = (typeof entry === "object" && entry.email) ? entry.email : entry;
					const label   = (typeof entry === "object") ? entry.label : null;
					if (label)
						formattedVCardString += xAbLabelGroup("EMAIL", e(address), label);
					else
						formattedVCardString += getEmailPropLine("other", address);
				});
			}

			if (vCard.logo.url)
				formattedVCardString += getPhotoContentLine("LOGO", vCard.logo);

			if (vCard.photo.url)
				formattedVCardString += getPhotoContentLine("PHOTO", vCard.photo);

			if (vCard.cellPhone)
			{
				if (!Array.isArray(vCard.cellPhone))
					vCard.cellPhone = [vCard.cellPhone];
				vCard.cellPhone.forEach(function(number) {
					formattedVCardString += getTelPropLine("cell", number);
				});
			}

			if (vCard.pagerPhone)
			{
				if (!Array.isArray(vCard.pagerPhone))
					vCard.pagerPhone = [vCard.pagerPhone];
				vCard.pagerPhone.forEach(function(number) {
					formattedVCardString += getTelPropLine("pager", number);
				});
			}

			if (vCard.homePhone)
			{
				if (!Array.isArray(vCard.homePhone))
					vCard.homePhone = [vCard.homePhone];
				vCard.homePhone.forEach(function(number) {
					formattedVCardString += getTelPropLine("voice", number, "home");
				});
			}

			if (vCard.workPhone)
			{
				if (!Array.isArray(vCard.workPhone))
					vCard.workPhone = [vCard.workPhone];
				vCard.workPhone.forEach(function(number) {
					formattedVCardString += getTelPropLine("voice", number, "work");
				});
			}

			if (vCard.homeFax)
			{
				if (!Array.isArray(vCard.homeFax))
					vCard.homeFax = [vCard.homeFax];
				vCard.homeFax.forEach(function(number) {
					formattedVCardString += getTelPropLine("fax", number, "home");
				});
			}

			if (vCard.workFax)
			{
				if (!Array.isArray(vCard.workFax))
					vCard.workFax = [vCard.workFax];
				vCard.workFax.forEach(function(number) {
					formattedVCardString += getTelPropLine("fax", number, "work");
				});
			}

			if (vCard.otherPhone)
			{
				if (!Array.isArray(vCard.otherPhone))
					vCard.otherPhone = [vCard.otherPhone];
				vCard.otherPhone.forEach(function(number) {
					formattedVCardString += getTelPropLine("voice", number);
				});
			}

			// Labeled phones with Apple X-ABLabel grouping
			if (vCard.labeledPhones && vCard.labeledPhones.length)
			{
				vCard.labeledPhones.forEach(function(entry) {
					const number = (typeof entry === "object" && entry.number) ? entry.number : entry;
					const label  = (typeof entry === "object") ? entry.label : null;
					if (label)
						formattedVCardString += xAbLabelGroup("TEL", e(number), label);
					else
						formattedVCardString += getTelPropLine("voice", number);
				});
			}

			[
				{ details: vCard.homeAddress, type: "home" },
				{ details: vCard.workAddress, type: "work" }
			].forEach(function(obj) {
				formattedVCardString += getAddressPropLine(obj.type, obj.details);
			});

			// Labeled addresses with Apple X-ABLabel grouping
			if (vCard.labeledAddresses && vCard.labeledAddresses.length)
			{
				vCard.labeledAddresses.forEach(function(addr) {
					if (addr.street || addr.city || addr.stateProvince || addr.postalCode || addr.countryRegion)
					{
						const values = ["", "", addr.street, addr.city, addr.stateProvince, addr.postalCode, addr.countryRegion];
						const adrValue = values.map(ec).join(";");
						if (addr.label)
							formattedVCardString += xAbLabelGroup("ADR", adrValue, addr.label);
						else
							formattedVCardString += contentLine("ADR", params, adrValue);
					}
				});
			}

			if (vCard.title)
				formattedVCardString += contentLine("TITLE", params, e(vCard.title));

			if (vCard.role)
				formattedVCardString += contentLine("ROLE", params, e(vCard.role));

			if (vCard.organization)
				formattedVCardString += contentLine("ORG", params, e(vCard.organization));

			if (vCard.url)
			{
				if (typeof vCard.url === "object" && !Array.isArray(vCard.url))
				{
					// Object with {label: url} entries → render as X-ABLabel groups
					for (const key in vCard.url)
					{
						if (vCard.url.hasOwnProperty(key) && vCard.url[key])
							formattedVCardString += xAbLabelGroup("URL", e(vCard.url[key]), key);
					}
				} else
				{
					if (!Array.isArray(vCard.url))
						vCard.url = [vCard.url];
					vCard.url.forEach(url => {
						formattedVCardString += contentLine("URL", params, e(url));
					});
				}
			}

			if (vCard.workUrl)
				formattedVCardString += contentLine("URL", ["TYPE=WORK"].concat(params), e(vCard.workUrl));

			if (vCard.note)
				formattedVCardString += contentLine("NOTE", params, e(vCard.note));

			if (vCard.socialUrls)
			{
				for (const key in vCard.socialUrls)
				{
					if (vCard.socialUrls.hasOwnProperty(key) && vCard.socialUrls[key])
						formattedVCardString += contentLine("X-SOCIALPROFILE", ["TYPE=" + key], e(vCard.socialUrls[key]));
				}
			}

			if (vCard.source)
				formattedVCardString += contentLine("SOURCE", params, e(vCard.source));

			formattedVCardString += contentLine("REV", [], (new Date()).toISOString());

			if (vCard.isOrganization)
				formattedVCardString += contentLine("X-ABShowAs", [], "COMPANY");

			formattedVCardString += contentLine("END", [], "VCARD");

			return formattedVCardString;
		}
	};
})();
