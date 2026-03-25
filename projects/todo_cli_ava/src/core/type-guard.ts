/**
 * Runtime type checking utilities
 */
export class TypeGuard {
    /**
     * Check if value is a string
     * @param value - The value to check
     * @returns true if value is a string
     */
    static isString(value: unknown): value is string {
        return typeof value === 'string';
    }

    /**
     * Check if value is a number
     * @param value - The value to check
     * @returns true if value is a number and not NaN
     */
    static isNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    }

    /**
     * Check if value is a boolean
     * @param value - The value to check
     * @returns true if value is a boolean
     */
    static isBoolean(value: unknown): value is boolean {
        return typeof value === 'boolean';
    }

    /**
     * Check if value is an object (not null and not an array)
     * @param value - The value to check
     * @returns true if value is a non-null, non-array object
     */
    static isObject(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Check if value is an array
     * @param value - The value to check
     * @returns true if value is an array
     */
    static isArray(value: unknown): value is any[] {
        return Array.isArray(value);
    }

    /**
     * Check if value is a function
     * @param value - The value to check
     * @returns true if value is a function
     */
    static isFunction(value: unknown): value is Function {
        return typeof value === 'function';
    }

    /**
     * Check if value is null
     * @param value - The value to check
     * @returns true if value is null
     */
    static isNull(value: unknown): value is null {
        return value === null;
    }

    /**
     * Check if value is undefined
     * @param value - The value to check
     * @returns true if value is undefined
     */
    static isUndefined(value: unknown): value is undefined {
        return value === undefined;
    }

    /**
     * Check if value is null or undefined
     * @param value - The value to check
     * @returns true if value is null or undefined
     */
    static isNullOrUndefined(value: unknown): value is null | undefined {
        return value == null;
    }

    /**
     * Check if value is a valid date
     * @param value - The value to check
     * @returns true if value is a valid Date object
     */
    static isDate(value: unknown): value is Date {
        return value instanceof Date && !isNaN(value.getTime());
    }

    /**
     * Check if value is a RegExp
     * @param value - The value to check
     * @returns true if value is a RegExp
     */
    static isRegExp(value: unknown): value is RegExp {
        return value instanceof RegExp;
    }

    /**
     * Check if value is a valid email format
     * @param value - The value to check
     * @returns true if value is a string and matches email pattern
     */
    static isEmail(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    /**
     * Check if value is a valid URL
     * @param value - The value to check
     * @returns true if value is a string and matches URL pattern
     */
    static isUrl(value: unknown): boolean {
        if (!this.isString(value)) return false;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if value is empty (null, undefined, empty string, empty array, or empty object)
     * @param value - The value to check
     * @returns true if value is empty
     */
    static isEmpty(value: unknown): boolean {
        if (this.isNullOrUndefined(value)) return true;
        if (this.isString(value) || this.isArray(value)) return value.length === 0;
        if (this.isObject(value)) return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Check if value is a positive number
     * @param value - The value to check
     * @returns true if value is a number and greater than 0
     */
    static isPositiveNumber(value: unknown): boolean {
        return this.isNumber(value) && value > 0;
    }

    /**
     * Check if value is a negative number
     * @param value - The value to check
     * @returns true if value is a number and less than 0
     */
    static isNegativeNumber(value: unknown): boolean {
        return this.isNumber(value) && value < 0;
    }

    /**
     * Check if value is an integer
     * @param value - The value to check
     * @returns true if value is a number and an integer
     */
    static isInteger(value: unknown): boolean {
        return this.isNumber(value) && Number.isInteger(value);
    }

    /**
     * Check if value is a float
     * @param value - The value to check
     * @returns true if value is a number and not an integer
     */
    static isFloat(value: unknown): boolean {
        return this.isNumber(value) && !Number.isInteger(value);
    }

    /**
     * Check if value is a valid JSON string
     * @param value - The value to check
     * @returns true if value is a string and valid JSON
     */
    static isJsonString(value: unknown): boolean {
        if (!this.isString(value)) return false;
        try {
            JSON.parse(value);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if value is a plain object (created by {} or new Object())
     * @param value - The value to check
     * @returns true if value is a plain object
     */
    static isPlainObject(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const proto = Object.getPrototypeOf(value);
        return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
    }

    /**
     * Check if value is a promise
     * @param value - The value to check
     * @returns true if value is a promise
     */
    static isPromise(value: unknown): boolean {
        return value instanceof Promise || (this.isObject(value) && this.isFunction(value.then) && this.isFunction(value.catch));
    }

    /**
     * Check if value is a valid UUID v4
     * @param value - The value to check
     * @returns true if value is a string and valid UUID
     */
    static isUuid(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    }

    /**
     * Check if value is a valid hexadecimal string
     * @param value - The value to check
     * @returns true if value is a string and valid hex
     */
    static isHex(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const hexRegex = /^[0-9a-f]+$/i;
        return value.length > 0 && hexRegex.test(value);
    }

    /**
     * Check if value is a valid base64 string
     * @param value - The value to check
     * @returns true if value is a string and valid base64
     */
    static isBase64(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return value.length > 0 && base64Regex.test(value) && value.length % 4 === 0;
    }

    /**
     * Check if value is a valid IP address
     * @param value - The value to check
     * @returns true if value is a string and valid IP
     */
    static isIpAddress(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(value);
    }

    /**
     * Check if value is a valid port number
     * @param value - The value to check
     * @returns true if value is a number and valid port (1-65535)
     */
    static isPort(value: unknown): boolean {
        return this.isInteger(value) && value >= 1 && value <= 65535;
    }

    /**
     * Check if value is a valid credit card number
     * @param value - The value to check
     * @returns true if value is a string and valid credit card
     */
    static isCreditCard(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const sanitized = value.replace(/\D/g, '');
        if (sanitized.length < 13 || sanitized.length > 19) return false;
        return this._luhnCheck(sanitized);
    }

    /**
     * Check if value is a valid phone number
     * @param value - The value to check
     * @returns true if value is a string and valid phone
     */
    static isPhoneNumber(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(value.replace(/[\s()-]/g, ''));
    }

    /**
     * Check if value is a valid postal code (US format)
     * @param value - The value to check
     * @returns true if value is a string and valid postal code
     */
    static isPostalCode(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const postalRegex = /^\d{5}(-\d{4})?$/;
        return postalRegex.test(value);
    }

    /**
     * Check if value is a valid lowercase string
     * @param value - The value to check
     * @returns true if value is a string and all lowercase
     */
    static isLowercase(value: unknown): boolean {
        return this.isString(value) && value === value.toLowerCase();
    }

    /**
     * Check if value is a valid uppercase string
     * @param value - The value to check
     * @returns true if value is a string and all uppercase
     */
    static isUppercase(value: unknown): boolean {
        return this.isString(value) && value === value.toUpperCase();
    }

    /**
     * Check if value is alphanumeric
     * @param value - The value to check
     * @returns true if value is a string and alphanumeric
     */
    static isAlphanumeric(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const alphanumericRegex = /^[a-z0-9]+$/i;
        return alphanumericRegex.test(value);
    }

    /**
     * Check if value is alphabetic
     * @param value - The value to check
     * @returns true if value is a string and alphabetic
     */
    static isAlpha(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const alphaRegex = /^[a-z]+$/i;
        return alphaRegex.test(value);
    }

    /**
     * Check if value is numeric
     * @param value - The value to check
     * @returns true if value is a string and numeric
     */
    static isNumeric(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const numericRegex = /^\d+$/;
        return numericRegex.test(value);
    }

    /**
     * Check if value is a valid GUID
     * @param value - The value to check
     * @returns true if value is a string and valid GUID
     */
    static isGuid(value: unknown): boolean {
        return this.isUuid(value);
    }

    /**
     * Check if value is a valid MAC address
     * @param value - The value to check
     * @returns true if value is a string and valid MAC
     */
    static isMacAddress(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const macRegex = /^[0-9a-f]{2}(:[0-9-a-f]{2}){5}$/i;
        return macRegex.test(value);
    }

    /**
     * Check if value is a valid IPv4 address
     * @param value - The value to check
     * @returns true if value is a string and valid IPv4
     */
    static isIPv4(value: unknown): boolean {
        return this.isIpAddress(value);
    }

    /**
     * Check if value is a valid IPv6 address
     * (Basic validation - checks for valid format)
     * @param value - The value to check
     * @returns true if value is a string and valid IPv6
     */
    static isIPv6(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::((ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv6Regex.test(value);
    }

    /**
     * Check if value is a valid IP address (v4 or v6)
     * @param value - The value to check
     * @returns true if value is a string and valid IP
     */
    static isIP(value: unknown): boolean {
        return this.isIPv4(value) || this.isIPv6(value);
    }

    /**
     * Check if value is a valid slug
     * @param value - The value to check
     * @returns true if value is a string and valid slug
     */
    static isSlug(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const slugRegex = /^[a-z0-9-]+$/;
        return slugRegex.test(value) && !value.startsWith('-') && !value.endsWith('-') && !value.includes('--');
    }

    /**
     * Check if value is a valid username
     * @param value - The value to check
     * @returns true if value is a string and valid username
     */
    static isUsername(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(value);
    }

    /**
     * Check if value is a valid password (strong password)
     * @param value - The value to check
     * @returns true if value is a string and strong password
     */
    static isStrongPassword(value: unknown): boolean {
        if (!this.isString(value)) return false;
        if (value.length < 8) return false;
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    /**
     * Check if value is a valid JWT token
     * @param value - The value to check
     * @returns true if value is a string and valid JWT
     */
    static isJWT(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const parts = value.split('.');
        return parts.length === 3 && parts.every(part => this.isBase64(part));
    }

    /**
     * Check if value is a valid hexadecimal color
     * @param value - The value to check
     * @returns true if value is a string and valid hex color
     */
    static isHexColor(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const hexColorRegex = /^#?[0-9a-fA-F]{6}$/;
        return hexColorRegex.test(value);
    }

    /**
     * Check if value is a valid RGB color
     * @param value - The value to check
     * @returns true if value is a string and valid RGB
     */
    static isRgbColor(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
        const match = value.match(rgbRegex);
        if (!match) return false;
        return [1, 2, 3].every(i => {
            const num = parseInt(match[i], 10);
            return num >= 0 && num <= 255;
        });
    }

    /**
     * Check if value is a valid HSL color
     * @param value - The value to check
     * (Basic validation - checks for valid format)
     * @returns true if value is a string and valid HSL
     */
    static isHslColor(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const hslRegex = /^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/;
        const match = value.match(hslRegex);
        if (!match) return false;
        const h = parseInt(match[1], 10);
        const s = parseInt(match[2], 10);
        const l = parseInt(match[3], 10);
        return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
    }

    /**
     * Check if value is a valid color (hex, rgb, or hsl)
     * @param value - The value to check
     * @returns true if value is a string and valid color
     */
    static isColor(value: unknown): boolean {
        return this.isHexColor(value) || this.isRgbColor(value) || this.isHslColor(value);
    }

    /**
     * Check if value is a valid timezone
     * @param value - The value to check
     * @returns true if value is a string and valid timezone
     */
    static isTimezone(value: unknown): boolean {
        if (!this.isString(value)) return false;
        try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if value is a valid locale
     * @param value - The value to check
     * @returns true if value is a string and valid locale
     */
    static isLocale(value: unknown): boolean {
        if (!this.isString(value)) return false;
        try {
            const locale = new Intl.Locale(value);
            return locale.language !== undefined;
        } catch {
            return false;
        }
    }

    /**
     * Check if value is a valid currency code
     * @param value - The value to check
     * @returns true if value is a string and valid currency code
     */
    static isCurrencyCode(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const currencyRegex = /^[A-Z]{3}$/;
        return currencyRegex.test(value);
    }

    /**
     * Check if value is a valid language code
     * @param value - The value to check
     * @returns true if value is a string and valid language code
     */
    static isLanguageCode(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const langRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
        return langRegex.test(value);
    }

    /**
     * Check if value is a valid country code
     * @param value - The value to check
     * @returns true if value is a string and valid country code
     */
    static isCountryCode(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const countryRegex = /^[A-Z]{2}$/;
        return countryRegex.test(value);
    }

    /**
     * Check if value is a valid emoji
     * @param value - The value to check
     * @returns true if value is a string and contains emoji
     */
    static isEmoji(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const emojiRegex = /\p{Emoji}/u;
        return emojiRegex.test(value);
    }

    /**
     * Check if value is a valid HTML tag
     * @param value - The value to check
     * @returns true if value is a string and valid HTML tag
     */
    static isHtmlTag(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlTagRegex = /^<([a-z1-6]+)([^<]*)>(?:.*?)<\/\1>$/i;
        return htmlTagRegex.test(value);
    }

    /**
     * Check if value is a valid CSS class name
     * @param value - The value to check
     * @returns true if value is a string and valid CSS class
     */
    static isCssClass(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const cssClassRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
        return cssClassRegex.test(value);
    }

    /**
     * Check if value is a valid HTML id
     * @param value - The value to check
     * @returns true if value is a string and valid HTML id
     */
    static isHtmlId(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlIdRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
        return htmlIdRegex.test(value);
    }

    /**
     * Check if value is a valid data attribute
     * @param value - The value to check
     * @returns true if value is a string and valid data attribute
     */
    static isDataAttribute(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const dataAttrRegex = /^data-[a-z-]+$/;
        return dataAttrRegex.test(value);
    }

    /**
     * Check if value is a valid CSS property
     * @param value - The value to check
     * @returns true if value is a string and valid CSS property
     */
    static isCssProperty(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const cssPropertyRegex = /^[a-z-]+$/;
        return cssPropertyRegex.test(value);
    }

    /**
     * Check if value is a valid CSS value
     * @param value - The value to check
     * @returns true if value is a string and valid CSS value
     */
    static isCssValue(value: unknown): boolean {
        if (!this.isString(value)) return false;
        return value.length > 0 && !value.includes('javascript:') && !value.includes('data:');
    }

    /**
     * Check if value is a valid HTML attribute
     * @param value - The value to check
     * @returns true if value is a string and valid HTML attribute
     */
    static isHtmlAttribute(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlAttrRegex = /^[a-z-]+$/;
        return htmlAttrRegex.test(value);
    }

    /**
     * Check if value is a valid HTML entity
     * @param value - The value to check
     * @returns true if value is a string and valid HTML entity
     */
    static isHtmlEntity(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlEntityRegex = /^&[a-zA-Z0-9#]+;$/;
        return htmlEntityRegex.test(value);
    }

    /**
     * Check if value is a valid HTML comment
     * @param value - The value to check
     * @returns true if value is a string and valid HTML comment
     */
    static isHtmlComment(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlCommentRegex = /^<!--[\s\S]*-->$/;
        return htmlCommentRegex.test(value);
    }

    /**
     * Check if value is a valid HTML input type
     * @param value - The value to check
     * @returns true if value is a string and valid HTML input type
     */
    static isHtmlInputType(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validTypes = [
            'text', 'password', 'email', 'number', 'tel', 'url', 'search',
            'checkbox', 'radio', 'file', 'hidden', 'image', 'submit',
            'reset', 'button', 'color', 'date', 'datetime-local',
            'month', 'range', 'time', 'week'
        ];
        return validTypes.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML form method
     * @param value - The value to check
     * @returns true if value is a string and valid HTML form method
     */
    static isHtmlFormMethod(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validMethods = ['get', 'post', 'dialog'];
        return validMethods.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML enctype
     * @param value - The value to check
     * @returns true if value is a string and valid HTML enctype
     */
    static isHtmlEnctype(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validEnctypes = [
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain'
        ];
        return validEnctypes.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML target
     * @param value - The value to check
     * @check if value is a string and valid HTML target
     */
    static isHtmlTarget(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validTargets = ['_blank', '_self', '_parent', '_top'];
        return validTargets.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML rel
     * @param value - The value to check
     * @returns true if value is a string and valid HTML rel
     */
    static isHtmlRel(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validRels = [
            'alternate', 'author', 'bookmark', 'external', 'help',
            'license', 'next', 'nofollow', 'noopener', 'noreferrer',
            'prev', 'search', 'tag'
        ];
        return validRels.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML csp
     * @param value - The value to check
     * @returns true if value is a string and valid HTML csp
     */
    static isHtmlCsp(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const cspRegex = /^[a-z-]+$/;
        return cspRegex.test(value);
    }

    /**
     * Check if value is a valid HTML feature policy
     * @param value - The value to check
     * @returns true if value is a string and valid HTML feature policy
     */
    static isHtmlFeaturePolicy(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const featurePolicyRegex = /^[a-z-]+$/;
        return featurePolicyRegex.test(value);
    }

    /**
     * Check if value is a valid HTML referrer policy
     * @param value - The value to check
     * @returns true if value is a string and valid HTML referrer policy
     */
    static isHtmlReferrerPolicy(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validReferrerPolicies = [
            'no-referrer', 'no-referrer-when-downgrade', 'origin',
            'origin-when-cross-origin', 'same-origin', 'strict-origin',
            'strict-origin-when-cross-origin', 'unsafe-url'
        ];
        return validReferrerPolicies.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML noreferer
     * @param value - The value to check
     * @returns true if value is a string and valid HTML noreferer
     */
    static isHtmlNoreferrer(value: unknown): boolean {
        return this.isHtmlReferrerPolicy(value) || value.toLowerCase() === 'noreferrer';
    }

    /**
     * Check if value is a valid HTML noopener
     * @param value - The value to check
     * @returns true if value is a string and valid HTML noopener
     */
    static isHtmlNoopener(value: unknown): boolean {
        return value.toLowerCase() === 'noopener';
    }

    /**
     * Check if value is a valid HTML nofollow
     * @param value - The value to check
     * @returns true if value is a string and valid HTML nofollow
     */
    static isHtmlNofollow(value: unknown): boolean {
        return value.toLowerCase() === 'nofollow';
    }

    /**
     * Check if value is a valid HTML external
     * @param value - The value to check
     * @returns true if value is a string and valid HTML external
     */
    static isHtmlExternal(value: unknown): boolean {
        return value.toLowerCase() === 'external';
    }

    /**
     * Check if value is a valid HTML bookmark
     * @param value - The value to check
     * @returns true if value is a string and valid HTML bookmark
     */
    static isHtmlBookmark(value: unknown): boolean {
        return value.toLowerCase() === 'bookmark';
    }

    /**
     * Check if value is a valid HTML help
     * @param value - The value to check
     * @returns true if value is a string and valid HTML help
     */
    static isHtmlHelp(value: unknown): boolean {
        return value.toLowerCase() === 'help';
    }

    /**
     * Check if value is a valid HTML license
     * @param value - The value to check
     * @returns true if value is a string and valid HTML license
     */
    static isHtmlLicense(value: unknown): boolean {
        return value.toLowerCase() === 'license';
    }

    /**
     * Check if value is a valid HTML next
     * @param value - The value to check
     * @returns true if value is a string and valid HTML next
     */
    static isHtmlNext(value: unknown): boolean {
        return value.toLowerCase() === 'next';
    }

    /**
     * Check if value is a valid HTML prev
     * @param value - The value to check
     * @returns true if value is a string and valid HTML prev
     */
    static isHtmlPrev(value: unknown): boolean {
        return value.toLowerCase() === 'prev';
    }

    /**
     * Check if value is a valid HTML search
     * @param value - The value to check
     * @returns true if value is a string and valid HTML search
     */
    static isHtmlSearch(value: unknown): boolean {
        return value.toLowerCase() === 'search';
    }

    /**
     * Check if value is a valid HTML tag
     * @param value - The value to check
     * @returns true if value is a string and valid HTML tag
     */
    static isHtmlTag(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const htmlTagRegex = /^[a-z]+$/;
        return htmlTagRegex.test(value);
    }

    /**
     * Check if value is a valid HTML void element
     * @param value - The value to check
     * @returns true if value is a string and valid HTML void element
     */
    static isHtmlVoidElement(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validVoidElements = [
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
            'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
        ];
        return validVoidElements.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML raw text element
     * @param value - The value to check
     * @returns true if value is a string and valid HTML raw text element
     */
    static isHtmlRawTextElement(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validRawTextElements = ['script', 'style'];
        return validRawTextElements.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML escape text element
     * @param value - The value to check
     * @returns true if value is a string and valid HTML escape text element
     */
    static isHtmlEscapeTextElement(value: unknown): boolean {
        if (!this.isString(value)) return false;
        const validEscapeTextElements = ['textarea', 'title'];
        return validEscapeTextElements.includes(value.toLowerCase());
    }

    /**
     * Check if value is a valid HTML foreign element
     * @param value - The value to check
     * @returns true if value is a string and valid HTML foreign element
     */
    static isHtmlForeignElement(value: unknown): boolean
