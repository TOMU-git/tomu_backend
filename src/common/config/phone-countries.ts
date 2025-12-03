export const PHONE_COUNTRY_MAP = {
    "AF": 93,
    "AX": 35818,
    "AL": 355,
    "AO": 244,
    "AR": 54,
    "AM": 374,
    "AW": 297,
    "AU": 61,
    "AT": 43,
    "AZ": 994,
    "BS": 1242,
    "BH": 973,
    "BD": 880,
    "BB": 1246,
    "BY": 375,
    "BE": 32,
    "BZ": 501,
    "BA": 387,
    "BR": 55,
    "BG": 359,
    "KH": 855,
    "US": 1,
    "CA": 1,
    "CF": 236,
    "CN": 86,
    "CO": 57,
    "HR": 385,
    "CU": 53,
    "CY": 357,
    "CZ": 420,
    "DK": 45,
    "EG": 20,
    "EE": 372,
    "FI": 358,
    "FR": 33,
    "GE": 995,
    "DE": 49,
    "GR": 30,
    "GB": 44,
    "HK": 852,
    "HU": 36,
    "IS": 354,
    "IN": 91,
    "ID": 62,
    "IR": 98,
    "IQ": 964,
    "IE": 353,
    "IL": 972,
    "IT": 39,
    "JP": 81,
    "KZ": 7,
    "RU": 7,
    "KW": 965,
    "KG": 996,
    "LV": 371,
    "LI": 423,
    "LT": 370,
    "LU": 352,
    "MK": 389,
    "MG": 261,
    "MY": 60,
    "MV": 960,
    "MT": 356,
    "MX": 52,
    "MD": 373,
    "MC": 377,
    "MN": 976,
    "MA": 212,
    "MM": 95,
    "NL": 31,
    "NZ": 64,
    "NO": 47,
    "OM": 968,
    "PK": 92,
    "PH": 63,
    "PL": 48,
    "PT": 351,
    "QA": 974,
    "RO": 40,
    "SA": 966,
    "RS": 381,
    "SG": 65,
    "SK": 421,
    "SI": 386,
    "KR": 82,
    "ES": 34,
    "LK": 94,
    "SE": 46,
    "CH": 41,
    "TW": 886,
    "TJ": 992,
    "TH": 66,
    "TN": 216,
    "TR": 90,
    "TM": 993,
    "UA": 380,
    "AE": 971,
    "UY": 598,
    "VI": 1340,
    "UZ": 998  // O'zbekiston qo'shildi
};

// Reverse mapping: Phone code -> Country code
// Uzun kodlar birinchi (35818 -> AX), keyin qisqaroq (7 -> RU)
const PHONE_TO_COUNTRY: Record<string, string> = {
    "35818": "AX",
    "1242": "BS",
    "1246": "BB",
    "1340": "VI",
    "998": "UZ",
    "996": "KG",
    "995": "GE",
    "994": "AZ",
    "993": "TM",
    "992": "TJ",
    "973": "BH",
    "974": "QA",
    "971": "AE",
    "968": "OM",
    "966": "SA",
    "965": "KW",
    "964": "IQ",
    "960": "MV",
    "886": "TW",
    "880": "BD",
    "855": "KH",
    "852": "HK",
    "598": "UY",
    "501": "BZ",
    "421": "SK",
    "420": "CZ",
    "423": "LI",
    "387": "BA",
    "386": "SI",
    "385": "HR",
    "381": "RS",
    "380": "UA",
    "377": "MC",
    "375": "BY",
    "374": "AM",
    "373": "MD",
    "372": "EE",
    "371": "LV",
    "370": "LT",
    "359": "BG",
    "358": "FI",
    "357": "CY",
    "356": "MT",
    "355": "AL",
    "354": "IS",
    "353": "IE",
    "352": "LU",
    "351": "PT",
    "389": "MK",
    "297": "AW",
    "261": "MG",
    "244": "AO",
    "236": "CF",
    "216": "TN",
    "212": "MA",
    "976": "MN",
    "972": "IL",
    "98": "IR",
    "95": "MM",
    "94": "LK",
    "93": "AF",
    "92": "PK",
    "91": "IN",
    "90": "TR",
    "86": "CN",
    "82": "KR",
    "81": "JP",
    "66": "TH",
    "65": "SG",
    "64": "NZ",
    "63": "PH",
    "62": "ID",
    "61": "AU",
    "60": "MY",
    "57": "CO",
    "55": "BR",
    "54": "AR",
    "53": "CU",
    "52": "MX",
    "49": "DE",
    "48": "PL",
    "47": "NO",
    "46": "SE",
    "45": "DK",
    "44": "GB",
    "43": "AT",
    "41": "CH",
    "40": "RO",
    "39": "IT",
    "36": "HU",
    "34": "ES",
    "33": "FR",
    "32": "BE",
    "31": "NL",
    "30": "GR",
    "20": "EG",
    "7": "RU",  // RU va KZ ikkalasi ham 7, lekin RU ko'proq uchraydi
    "1": "US"   // US, CA, BS, BB, VI - barchasi 1, lekin US default
};

/**
 * Telefon raqamidan country code ni aniqlaydi
 * @param phone - Telefon raqami (+998901234567 yoki 998901234567)
 * @returns Country code (UZ, RU, US...) yoki null
 */
export function getCountryCode(phone: string): string | null {
    // + belgisini olib tashlash
    const cleanPhone = phone.replace(/^\+/, '').replace(/\s/g, '');

    // Uzun kodlardan boshlab tekshirish (35818, 1242...)
    for (let len = 5; len >= 1; len--) {
        const prefix = cleanPhone.substring(0, len);
        if (PHONE_TO_COUNTRY[prefix]) {
            return PHONE_TO_COUNTRY[prefix];
        }
    }

    return null;
}

/**
 * O'zbekiston raqamini tekshiradi
 * @param phone - Telefon raqami
 * @returns true agar O'zbekiston raqami bo'lsa
 */
export function isUzbekistanNumber(phone: string): boolean {
    const cleanPhone = phone.replace(/^\+/, '').replace(/\s/g, '');
    return cleanPhone.startsWith('998');
}

/**
 * Telefon raqamini formatlaydi (+ belgisini olib tashlaydi)
 * @param phone - Telefon raqami
 * @returns Formatlangan raqam
 */
export function formatPhoneNumber(phone: string): string {
    return phone.replace(/^\+/, '').replace(/\s/g, '');
}
