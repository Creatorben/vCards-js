/********************************************************************************
 vCards-js, Eric J Nesser, November 2014,
 ********************************************************************************/
/*jslint node: true */
'use strict';

/**
 * vCard formatter for formatting vCards in VCF format
 */
(function vCardFormatter() {
  var majorVersion = '4';

  /**
   * Encode string
   * @param  {String}     value to encode
   * @return {String}     encoded string
   */
  function e(value) {
    if (value) {
      if (typeof value !== 'string') {
        value = '' + value;
      }
      // Unicode normalisieren
      value = value.normalize('NFC');

      return value
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    }
    return '';
  }

  /**
   * Return new line characters
   * @return {String} new line characters
   */
  function nl() {
    return '\r\n';
  }

  /**
   * Get formatted photo
   * @param  {String} photoType       Photo type (PHOTO, LOGO)
   * @param  {String} url             URL to attach photo from
   * @param  {String} mediaType       Media-type of photo (JPEG, PNG, GIF)
   * @return {String}                 Formatted photo
   */
  function getFormattedPhoto(photoType, url, mediaType, base64) {
    var params;

    if (majorVersion >= 4) {
      params = base64 ? ';ENCODING=b;MEDIATYPE=image/' : ';MEDIATYPE=image/';
    } else if (majorVersion === 3) {
      params = base64 ? ';ENCODING=b;TYPE=' : ';TYPE=';
    } else {
      params = base64 ? ';ENCODING=BASE64;' : ';';
    }

    var formattedPhoto = photoType + params + mediaType + ':' + e(url) + nl();
    return formattedPhoto;
  }

  /**
   * Get formatted address
   * @param  {object}         address
   * @param  {object}         encoding prefix
   * @return {String}         Formatted address
   */
  function getFormattedAddress(encodingPrefix, address) {
    var formattedAddress = '';

    if (
      address.details.label ||
      address.details.street ||
      address.details.city ||
      address.details.stateProvince ||
      address.details.postalCode ||
      address.details.countryRegion
    ) {
      if (majorVersion >= 4) {
        formattedAddress =
          'ADR' +
          (address.details.label
            ? ';LABEL="' + e(address.details.label) + '"'
            : ';TYPE=' + address.type) +
          ':;;' +
          e(address.details.street) +
          ';' +
          e(address.details.city) +
          ';' +
          e(address.details.stateProvince) +
          ';' +
          e(address.details.postalCode) +
          ';' +
          e(address.details.countryRegion) +
          nl();
      } else {
        if (address.details.label) {
          formattedAddress =
            'LABEL' +
            encodingPrefix +
            ';TYPE=' +
            address.type +
            ':' +
            e(address.details.label) +
            nl();
        }
        formattedAddress +=
          'ADR' +
          encodingPrefix +
          ';TYPE=' +
          address.type +
          ':;;' +
          e(address.details.street) +
          ';' +
          e(address.details.city) +
          ';' +
          e(address.details.stateProvince) +
          ';' +
          e(address.details.postalCode) +
          ';' +
          e(address.details.countryRegion) +
          nl();
      }
    }

    return formattedAddress;
  }

  function getFormattedLabeledAddress(addressData, encodingPrefix) {
    var formattedAddress = '';

    if (addressData.street || addressData.city || addressData.postalCode) {
      if (addressData.label) {
        var itemId = 'item' + Math.random().toString(36).substr(2, 9);
        formattedAddress =
          itemId +
          '.ADR:;;' +
          e(addressData.street) +
          ';' +
          e(addressData.city) +
          ';' +
          e(addressData.stateProvince) +
          ';' +
          e(addressData.postalCode) +
          ';' +
          e(addressData.countryRegion) +
          nl() +
          itemId +
          '.X-ABLabel:' +
          e(addressData.label) +
          nl();
      } else {
        formattedAddress =
          'ADR:;;' +
          e(addressData.street) +
          ';' +
          e(addressData.city) +
          ';' +
          e(addressData.stateProvince) +
          ';' +
          e(addressData.postalCode) +
          ';' +
          e(addressData.countryRegion) +
          nl();
      }
    }

    return formattedAddress;
  }

  /**
   * Convert date to YYYYMMDD format
   * @param  {Date}       date to encode
   * @return {String}     encoded date
   */
  function YYYYMMDD(date) {
    return (
      date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2)
    );
  }

  /**
   * Get formatted phone number with label support
   * @param  {String|Object} phoneData - Phone number or object with number and label
   * @param  {String} defaultType - Default TYPE if no label provided
   * @return {String} Formatted phone number
   */
  function getFormattedPhone(phoneData, defaultType) {
    var number, label;

    if (typeof phoneData === 'object' && phoneData.number) {
      number = phoneData.number;
      label = phoneData.label;
    } else {
      number = phoneData;
      label = null;
    }

    if (majorVersion >= 4) {
      if (label) {
        // Apple Item-Grouping verwenden
        var itemId = 'item' + Math.random().toString(36).substr(2, 9);
        return (
          itemId +
          '.TEL:' +
          e(number) +
          nl() +
          itemId +
          '.X-ABLabel:' +
          e(label) +
          nl()
        );
      } else {
        return 'TEL;TYPE=' + defaultType + ':' + e(number) + nl();
      }
    } else {
      return 'TEL;TYPE=' + defaultType + ':' + e(number) + nl();
    }
  }

  /**
   * Get formatted email with label support
   * @param  {String|Object} emailData - Email address or object with email and label
   * @param  {String} defaultType - Default TYPE if no label provided
   * @return {String} Formatted email
   */
  function getFormattedEmail(emailData, defaultType) {
    var email, label;

    if (typeof emailData === 'object' && emailData.email) {
      email = emailData.email;
      label = emailData.label;
    } else {
      email = emailData;
      label = null;
    }

    var encodingPrefix = majorVersion >= 4 ? '' : ';CHARSET=UTF-8';

    if (majorVersion >= 4) {
      if (label) {
        return 'EMAIL;LABEL="' + e(label) + '":' + e(email) + nl();
      } else {
        return 'EMAIL;type=' + defaultType + ':' + e(email) + nl();
      }
    } else if (majorVersion >= 3) {
      return (
        'EMAIL' +
        encodingPrefix +
        ';type=' +
        defaultType +
        ',INTERNET:' +
        e(email) +
        nl()
      );
    } else {
      return (
        'EMAIL' +
        encodingPrefix +
        ';' +
        defaultType +
        ';INTERNET:' +
        e(email) +
        nl()
      );
    }
  }

  /**
   * Get formatted labeled email
   * @param  {Object} emailData - Object with email and label
   * @return {String} Formatted email
   */
  function getFormattedLabeledEmail(emailData) {
    var email = emailData.email;
    var label = emailData.label;

    if (majorVersion >= 4) {
      if (label) {
        // Apple Item-Grouping verwenden
        var itemId = 'item' + Math.random().toString(36).substr(2, 9);
        return (
          itemId +
          '.EMAIL:' +
          e(email) +
          nl() +
          itemId +
          '.X-ABLabel:' +
          e(label) +
          nl()
        );
      } else {
        // Fallback ohne Label
        return 'EMAIL:' + e(email) + nl();
      }
    } else {
      // Für ältere Versionen einfaches Format
      var encodingPrefix = ';CHARSET=UTF-8';
      return 'EMAIL' + encodingPrefix + ';INTERNET:' + e(email) + nl();
    }
  }

  module.exports = {
    /**
     * Get formatted vCard in VCF format
     * @param  {object}     vCard object
     * @return {String}     Formatted vCard in VCF format
     */
    getFormattedString: function (vCard) {
      majorVersion = vCard.getMajorVersion();

      var formattedVCardString = '';
      formattedVCardString += 'BEGIN:VCARD' + nl();
      formattedVCardString += 'VERSION:' + vCard.version + nl();

      var encodingPrefix = majorVersion >= 4 ? '' : ';CHARSET=UTF-8';
      var formattedName = vCard.formattedName;

      if (!formattedName) {
        formattedName = '';

        [vCard.firstName, vCard.middleName, vCard.lastName].forEach(function (
          name
        ) {
          if (name) {
            if (formattedName) {
              formattedName += ' ';
            }
          }
          formattedName += name;
        });
      }

      formattedVCardString +=
        'FN' + encodingPrefix + ':' + e(formattedName) + nl();
      formattedVCardString +=
        'N' +
        encodingPrefix +
        ':' +
        e(vCard.lastName) +
        ';' +
        e(vCard.firstName) +
        ';' +
        e(vCard.middleName) +
        ';' +
        e(vCard.namePrefix) +
        ';' +
        e(vCard.nameSuffix) +
        nl();

      if (vCard.nickname && majorVersion >= 3) {
        formattedVCardString +=
          'NICKNAME' + encodingPrefix + ':' + e(vCard.nickname) + nl();
      }

      if (vCard.gender) {
        formattedVCardString += 'GENDER:' + e(vCard.gender) + nl();
      }

      if (vCard.uid) {
        formattedVCardString +=
          'UID' + encodingPrefix + ':' + e(vCard.uid) + nl();
      }

      if (vCard.birthday) {
        formattedVCardString += 'BDAY:' + YYYYMMDD(vCard.birthday) + nl();
      }

      if (vCard.anniversary) {
        formattedVCardString +=
          'ANNIVERSARY:' + YYYYMMDD(vCard.anniversary) + nl();
      }

      if (vCard.email) {
        if (!Array.isArray(vCard.email)) {
          vCard.email = [vCard.email];
        }
        vCard.email.forEach(function (address) {
          formattedVCardString += getFormattedEmail(address, 'HOME');
        });
      }

      if (vCard.workEmail) {
        if (!Array.isArray(vCard.workEmail)) {
          vCard.workEmail = [vCard.workEmail];
        }
        vCard.workEmail.forEach(function (address) {
          formattedVCardString += getFormattedEmail(address, 'WORK');
        });
      }

      if (vCard.otherEmail) {
        if (!Array.isArray(vCard.otherEmail)) {
          vCard.otherEmail = [vCard.otherEmail];
        }
        vCard.otherEmail.forEach(function (address) {
          formattedVCardString += getFormattedEmail(address, 'OTHER');
        });
      }

      if (vCard.labeledEmails) {
        vCard.labeledEmails.forEach(function (email) {
          formattedVCardString += getFormattedLabeledEmail(email, 'INTERNET');
        });
      }

      if (vCard.logo.url) {
        formattedVCardString += getFormattedPhoto(
          'LOGO',
          vCard.logo.url,
          vCard.logo.mediaType,
          vCard.logo.base64
        );
      }

      if (vCard.photo.url) {
        formattedVCardString += getFormattedPhoto(
          'PHOTO',
          vCard.photo.url,
          vCard.photo.mediaType,
          vCard.photo.base64
        );
      }

      if (vCard.cellPhone) {
        if (!Array.isArray(vCard.cellPhone)) {
          vCard.cellPhone = [vCard.cellPhone];
        }
        vCard.cellPhone.forEach(function (number) {
          formattedVCardString += getFormattedPhone(number, 'CELL');
        });
      }

      if (vCard.pagerPhone) {
        if (!Array.isArray(vCard.pagerPhone)) {
          vCard.pagerPhone = [vCard.pagerPhone];
        }
        vCard.pagerPhone.forEach(function (number) {
          formattedVCardString += getFormattedPhone(number, 'PAGER');
        });
      }

      if (vCard.homePhone) {
        if (!Array.isArray(vCard.homePhone)) {
          vCard.homePhone = [vCard.homePhone];
        }
        vCard.homePhone.forEach(function (number) {
          var defaultType = majorVersion >= 4 ? 'HOME' : 'HOME,VOICE';
          formattedVCardString += getFormattedPhone(number, defaultType);
        });
      }

      if (vCard.workPhone) {
        if (!Array.isArray(vCard.workPhone)) {
          vCard.workPhone = [vCard.workPhone];
        }
        vCard.workPhone.forEach(function (number) {
          var defaultType = majorVersion >= 4 ? 'WORK' : 'WORK,VOICE';
          formattedVCardString += getFormattedPhone(number, defaultType);
        });
      }

      if (vCard.labeledPhones) {
        vCard.labeledPhones.forEach(function (phone) {
          formattedVCardString += getFormattedPhone(phone, 'VOICE');
        });
      }

      if (vCard.homeFax) {
        if (!Array.isArray(vCard.homeFax)) {
          vCard.homeFax = [vCard.homeFax];
        }
        vCard.homeFax.forEach(function (number) {
          formattedVCardString += getFormattedPhone(number, 'HOME,FAX');
        });
      }

      if (vCard.workFax) {
        if (!Array.isArray(vCard.workFax)) {
          vCard.workFax = [vCard.workFax];
        }
        vCard.workFax.forEach(function (number) {
          formattedVCardString += getFormattedPhone(number, 'WORK,FAX');
        });
      }

      if (vCard.otherPhone) {
        if (!Array.isArray(vCard.otherPhone)) {
          vCard.otherPhone = [vCard.otherPhone];
        }
        vCard.otherPhone.forEach(function (number) {
          formattedVCardString += getFormattedPhone(number, 'OTHER');
        });
      }

      [
        {
          details: vCard.homeAddress,
          type: 'HOME',
        },
        {
          details: vCard.workAddress,
          type: 'WORK',
        },
      ].forEach(function (address) {
        formattedVCardString += getFormattedAddress(encodingPrefix, address);
      });

      if (vCard.labeledAddresses) {
        vCard.labeledAddresses.forEach(function (address) {
          formattedVCardString += getFormattedLabeledAddress(
            address,
            encodingPrefix
          );
        });
      }

      if (vCard.title) {
        formattedVCardString +=
          'TITLE' + encodingPrefix + ':' + e(vCard.title) + nl();
      }

      if (vCard.role) {
        formattedVCardString +=
          'ROLE' + encodingPrefix + ':' + e(vCard.role) + nl();
      }

      if (vCard.organization) {
        formattedVCardString +=
          'ORG' + encodingPrefix + ':' + e(vCard.organization) + nl();
      }

      if (vCard.url) {
        // Für vCard 4.0
        if (typeof vCard.url === 'object' && !Array.isArray(vCard.url)) {
          for (var key in vCard.url) {
            if (vCard.url.hasOwnProperty(key) && vCard.url[key]) {
              var itemId = 'item' + Math.random().toString(36).substr(2, 9);
              formattedVCardString +=
                itemId +
                '.URL:' +
                e(vCard.url[key]) +
                nl() +
                itemId +
                '.X-ABLabel:' +
                e(key) +
                nl();
            }
          }
        }
        // Backwards compatibility für einzelne URL
        else if (typeof vCard.url === 'string') {
          formattedVCardString +=
            'URL' + encodingPrefix + ':' + e(vCard.url) + nl();
        }
      }

      if (vCard.workUrl) {
        formattedVCardString +=
          'URL;type=WORK' + encodingPrefix + ':' + e(vCard.workUrl) + nl();
      }

      if (vCard.note) {
        formattedVCardString +=
          'NOTE' + encodingPrefix + ':' + e(vCard.note) + nl();
      }

      if (vCard.socialUrls) {
        for (var key in vCard.socialUrls) {
          if (vCard.socialUrls.hasOwnProperty(key) && vCard.socialUrls[key]) {
            formattedVCardString +=
              'X-SOCIALPROFILE:TYPE=' +
              key +
              ':' +
              e(vCard.socialUrls[key]) +
              nl();
          }
        }
      }

      if (vCard.source) {
        formattedVCardString +=
          'SOURCE' + encodingPrefix + ':' + e(vCard.source) + nl();
      }

      formattedVCardString += 'REV:' + new Date().toISOString() + nl();

      if (vCard.isOrganization) {
        formattedVCardString += 'X-ABShowAs:COMPANY' + nl();
      }

      formattedVCardString += 'END:VCARD' + nl();
      return formattedVCardString;
    },
  };
})();
