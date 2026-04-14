export const TC = { Da: "#E8A87C", Yun: "#95B8D1" };
export const TYPE_CFG = {
  food: { emoji: "🍽️", label: "美食", bg: "#FFF3E0" },
  activity: { emoji: "🎯", label: "景點", bg: "#E8F5E9" },
  shopping: { emoji: "🛍️", label: "購物", bg: "#FCE4EC" },
  transport: { emoji: "🚗", label: "交通", bg: "#E3F2FD" },
};
export const DEFAULT_EXP_CATS = ["exp.cat_food", "exp.cat_transport", "exp.cat_ticket", "exp.cat_shopping", "exp.cat_stay", "exp.cat_other"];

// Expanded currencies — auto-derived from destination country
export const CURRENCIES = {
  // 亞洲
  KRW: { symbol: "₩", label: "韓幣" },
  TWD: { symbol: "NT$", label: "台幣" },
  JPY: { symbol: "¥", label: "日幣" },
  CNY: { symbol: "¥", label: "人民幣" },
  THB: { symbol: "฿", label: "泰銖" },
  SGD: { symbol: "S$", label: "新幣" },
  HKD: { symbol: "HK$", label: "港幣" },
  MOP: { symbol: "MOP$", label: "澳門幣" },
  MYR: { symbol: "RM", label: "馬幣" },
  IDR: { symbol: "Rp", label: "印尼盾" },
  VND: { symbol: "₫", label: "越南盾" },
  PHP: { symbol: "₱", label: "菲幣" },
  KHR: { symbol: "៛", label: "柬埔寨瑞爾" },
  MMK: { symbol: "K", label: "緬甸緬元" },
  INR: { symbol: "₹", label: "印度盧比" },
  NPR: { symbol: "₨", label: "尼泊爾盧比" },
  TRY: { symbol: "₺", label: "土耳其里拉" },
  AED: { symbol: "د.إ", label: "迪拉姆" },
  QAR: { symbol: "﷼", label: "卡達里亞爾" },
  SAR: { symbol: "﷼", label: "沙烏地里亞爾" },
  EGP: { symbol: "£", label: "埃及鎊" },
  MAD: { symbol: "د.م.", label: "摩洛哥迪拉姆" },
  ZAR: { symbol: "R", label: "南非蘭特" },
  // 歐洲
  EUR: { symbol: "€", label: "歐元" },
  GBP: { symbol: "£", label: "英鎊" },
  CHF: { symbol: "Fr", label: "瑞士法郎" },
  CZK: { symbol: "Kč", label: "捷克克朗" },
  DKK: { symbol: "kr", label: "丹麥克朗" },
  NOK: { symbol: "kr", label: "挪威克朗" },
  SEK: { symbol: "kr", label: "瑞典克朗" },
  ISK: { symbol: "kr", label: "冰島克朗" },
  PLN: { symbol: "zł", label: "波蘭茲羅提" },
  HUF: { symbol: "Ft", label: "匈牙利福林" },
  HRK: { symbol: "kn", label: "克羅埃西亞庫納" },
  // 美洲
  USD: { symbol: "$", label: "美金" },
  CAD: { symbol: "C$", label: "加幣" },
  MXN: { symbol: "$", label: "墨西哥披索" },
  // 大洋洲
  AUD: { symbol: "A$", label: "澳幣" },
  NZD: { symbol: "NZ$", label: "紐幣" },
};

// country_code → currency (ISO 3166-1 alpha-2)
export const COUNTRY_CURRENCY = {
  KR: "KRW", JP: "JPY", TW: "TWD", TH: "THB",
  SG: "SGD", HK: "HKD", MO: "MOP",
  MY: "MYR", ID: "IDR", VN: "VND", PH: "PHP",
  KH: "KHR", MM: "MMK", NP: "NPR", IN: "INR", CN: "CNY", TR: "TRY",
  AE: "AED", QA: "QAR", SA: "SAR", EG: "EGP", MA: "MAD", ZA: "ZAR",
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  AT: "EUR", PT: "EUR", BE: "EUR", FI: "EUR", IE: "EUR",
  GR: "EUR", SK: "EUR", LU: "EUR", SI: "EUR", MC: "EUR",
  GB: "GBP", CH: "CHF", CZ: "CZK", DK: "DKK", NO: "NOK", SE: "SEK",
  IS: "ISK", PL: "PLN", HU: "HUF", HR: "HRK",
  US: "USD", CA: "CAD", MX: "MXN", AU: "AUD", NZ: "NZD",
};

// Country code → Traditional Chinese country name (for display)
export const COUNTRY_NAMES_ZH = {
  KR: "🇰🇷 韓國", JP: "🇯🇵 日本", TW: "🇹🇼 台灣", TH: "🇹🇭 泰國",
  SG: "🇸🇬 新加坡", HK: "🇭🇰 香港", MO: "🇲🇴 澳門",
  MY: "🇲🇾 馬來西亞", ID: "🇮🇩 印尼", VN: "🇻🇳 越南",
  PH: "🇵🇭 菲律賓", AE: "🇦🇪 阿聯酋", QA: "🇶🇦 卡達", SA: "🇸🇦 沙烏地",
  FR: "🇫🇷 法國", DE: "🇩🇪 德國", IT: "🇮🇹 義大利", ES: "🇪🇸 西班牙",
  NL: "🇳🇱 荷蘭", AT: "🇦🇹 奧地利", PT: "🇵🇹 葡萄牙", BE: "🇧🇪 比利時",
  GB: "🇬🇧 英國", CH: "🇨🇭 瑞士", CZ: "🇨🇿 捷克", DK: "🇩🇰 丹麥",
  NO: "🇳🇴 挪威", SE: "🇸🇪 瑞典", FI: "🇫🇮 芬蘭", PL: "🇵🇱 波蘭",
  HU: "🇭🇺 匈牙利", GR: "🇬🇷 希臘", HR: "🇭🇷 克羅埃西亞",
  IS: "🇮🇸 冰島", IE: "🇮🇪 愛爾蘭", MC: "🇲🇨 摩納哥",
  US: "🇺🇸 美國", CA: "🇨🇦 加拿大", MX: "🇲🇽 墨西哥",
  AU: "🇦🇺 澳洲", NZ: "🇳🇿 紐西蘭",
  TR: "🇹🇷 土耳其", IN: "🇮🇳 印度", CN: "🇨🇳 中國",
  KH: "🇰🇭 柬埔寨", MM: "🇲🇲 緬甸", NP: "🇳🇵 尼泊爾",
  EG: "🇪🇬 埃及", MA: "🇲🇦 摩洛哥", ZA: "🇿🇦 南非",
};

// Comprehensive city list with Traditional Chinese names + coordinates from Open-Meteo geocoding API
export const DESTINATION_CITIES = [
  // 韓國
  { name: "首爾", en: "Seoul", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 37.5665, longitude: 126.9780 },
  { name: "釜山", en: "Busan", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 35.1796, longitude: 129.0756 },
  { name: "濟州島", en: "Jeju", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 33.4996, longitude: 126.5312 },
  { name: "仁川", en: "Incheon", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 37.4563, longitude: 126.7052 },
  { name: "慶州", en: "Gyeongju", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 35.8562, longitude: 129.2247 },
  { name: "全州", en: "Jeonju", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 35.8242, longitude: 127.1480 },
  { name: "大邱", en: "Daegu", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 35.8714, longitude: 128.6014 },
  { name: "春川", en: "Chuncheon", country_zh: "🇰🇷 韓國", country_code: "KR", latitude: 37.8748, longitude: 127.7342 },
  // 日本
  { name: "東京", en: "Tokyo", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 35.6762, longitude: 139.6503 },
  { name: "大阪", en: "Osaka", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 34.6937, longitude: 135.5023 },
  { name: "京都", en: "Kyoto", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 35.0116, longitude: 135.7681 },
  { name: "福岡", en: "Fukuoka", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 33.5904, longitude: 130.4017 },
  { name: "札幌", en: "Sapporo", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 43.0618, longitude: 141.3545 },
  { name: "那霸（沖繩）", en: "Naha", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 26.2124, longitude: 127.6809 },
  { name: "名古屋", en: "Nagoya", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 35.1815, longitude: 136.9066 },
  { name: "廣島", en: "Hiroshima", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 34.3853, longitude: 132.4553 },
  { name: "橫濱", en: "Yokohama", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 35.4437, longitude: 139.6380 },
  { name: "神戶", en: "Kobe", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 34.6901, longitude: 135.1956 },
  { name: "奈良", en: "Nara", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 34.6851, longitude: 135.8049 },
  { name: "金澤", en: "Kanazawa", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 36.5944, longitude: 136.6256 },
  { name: "仙台", en: "Sendai", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 38.2682, longitude: 140.8694 },
  { name: "長崎", en: "Nagasaki", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 32.7503, longitude: 129.8779 },
  { name: "箱根", en: "Hakone", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 35.2329, longitude: 139.1069 },
  { name: "日光", en: "Nikko", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 36.7198, longitude: 139.6983 },
  { name: "函館", en: "Hakodate", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 41.7687, longitude: 140.7288 },
  { name: "鹿兒島", en: "Kagoshima", country_zh: "🇯🇵 日本", country_code: "JP", latitude: 31.5969, longitude: 130.5571 },
  // 泰國
  { name: "曼谷", en: "Bangkok", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 13.7563, longitude: 100.5018 },
  { name: "清邁", en: "Chiang Mai", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 18.7883, longitude: 98.9853 },
  { name: "普吉島", en: "Phuket", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 7.8804, longitude: 98.3923 },
  { name: "芭達雅", en: "Pattaya", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 12.9235, longitude: 100.8825 },
  { name: "甲米", en: "Krabi", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 8.0862, longitude: 98.9063 },
  { name: "蘇梅島", en: "Koh Samui", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 9.5120, longitude: 100.0136 },
  { name: "清萊", en: "Chiang Rai", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 19.9105, longitude: 99.8406 },
  { name: "華欣", en: "Hua Hin", country_zh: "🇹🇭 泰國", country_code: "TH", latitude: 12.5684, longitude: 99.9578 },
  // 新加坡、香港、澳門
  { name: "新加坡", en: "Singapore", country_zh: "🇸🇬 新加坡", country_code: "SG", latitude: 1.3521, longitude: 103.8198 },
  { name: "香港", en: "Hong Kong", country_zh: "🇭🇰 香港", country_code: "HK", latitude: 22.3193, longitude: 114.1694 },
  { name: "澳門", en: "Macau", country_zh: "🇲🇴 澳門", country_code: "MO", latitude: 22.1987, longitude: 113.5439 },
  // 台灣
  { name: "台北", en: "Taipei", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 25.0330, longitude: 121.5654 },
  { name: "台中", en: "Taichung", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 24.1477, longitude: 120.6736 },
  { name: "高雄", en: "Kaohsiung", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 22.6273, longitude: 120.3014 },
  { name: "台南", en: "Tainan", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 22.9999, longitude: 120.2269 },
  { name: "花蓮", en: "Hualien", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 23.9871, longitude: 121.6015 },
  { name: "台東", en: "Taitung", country_zh: "🇹🇼 台灣", country_code: "TW", latitude: 22.7583, longitude: 121.1444 },
  // 馬來西亞
  { name: "吉隆坡", en: "Kuala Lumpur", country_zh: "🇲🇾 馬來西亞", country_code: "MY", latitude: 3.1390, longitude: 101.6869 },
  { name: "檳城", en: "Penang", country_zh: "🇲🇾 馬來西亞", country_code: "MY", latitude: 5.4141, longitude: 100.3288 },
  { name: "蘭卡威", en: "Langkawi", country_zh: "🇲🇾 馬來西亞", country_code: "MY", latitude: 6.3504, longitude: 99.7996 },
  { name: "亞庇", en: "Kota Kinabalu", country_zh: "🇲🇾 馬來西亞", country_code: "MY", latitude: 5.9804, longitude: 116.0735 },
  { name: "新山", en: "Johor Bahru", country_zh: "🇲🇾 馬來西亞", country_code: "MY", latitude: 1.4927, longitude: 103.7414 },
  // 印尼
  { name: "峇里島", en: "Bali", country_zh: "🇮🇩 印尼", country_code: "ID", latitude: -8.6500, longitude: 115.2167 },
  { name: "雅加達", en: "Jakarta", country_zh: "🇮🇩 印尼", country_code: "ID", latitude: -6.2088, longitude: 106.8456 },
  { name: "日惹", en: "Yogyakarta", country_zh: "🇮🇩 印尼", country_code: "ID", latitude: -7.7971, longitude: 110.3688 },
  { name: "龍目島", en: "Lombok", country_zh: "🇮🇩 印尼", country_code: "ID", latitude: -8.5831, longitude: 116.1165 },
  { name: "科莫多島", en: "Komodo", country_zh: "🇮🇩 印尼", country_code: "ID", latitude: -8.5000, longitude: 119.5000 },
  // 越南
  { name: "胡志明市", en: "Ho Chi Minh City", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 10.8231, longitude: 106.6297 },
  { name: "河內", en: "Hanoi", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 21.0285, longitude: 105.8542 },
  { name: "峴港", en: "Da Nang", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 16.0544, longitude: 108.2022 },
  { name: "會安", en: "Hoi An", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 15.8801, longitude: 108.3380 },
  { name: "芽莊", en: "Nha Trang", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 12.2388, longitude: 109.1967 },
  { name: "順化", en: "Hue", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 16.4637, longitude: 107.5909 },
  { name: "富國島", en: "Phu Quoc", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 10.2899, longitude: 103.9840 },
  { name: "下龍灣", en: "Ha Long", country_zh: "🇻🇳 越南", country_code: "VN", latitude: 20.9531, longitude: 107.0825 },
  // 菲律賓
  { name: "馬尼拉", en: "Manila", country_zh: "🇵🇭 菲律賓", country_code: "PH", latitude: 14.5995, longitude: 120.9842 },
  { name: "宿霧", en: "Cebu", country_zh: "🇵🇭 菲律賓", country_code: "PH", latitude: 10.3157, longitude: 123.8854 },
  { name: "長灘島", en: "Boracay", country_zh: "🇵🇭 菲律賓", country_code: "PH", latitude: 11.9674, longitude: 121.9248 },
  { name: "巴拉望", en: "Palawan", country_zh: "🇵🇭 菲律賓", country_code: "PH", latitude: 9.8349, longitude: 118.7384 },
  { name: "薄荷島", en: "Bohol", country_zh: "🇵🇭 菲律賓", country_code: "PH", latitude: 9.6700, longitude: 124.0645 },
  // 柬埔寨、緬甸、尼泊爾
  { name: "暹粒（吳哥窟）", en: "Siem Reap", country_zh: "🇰🇭 柬埔寨", country_code: "KH", latitude: 13.3671, longitude: 103.8448 },
  { name: "金邊", en: "Phnom Penh", country_zh: "🇰🇭 柬埔寨", country_code: "KH", latitude: 11.5449, longitude: 104.8922 },
  { name: "仰光", en: "Yangon", country_zh: "🇲🇲 緬甸", country_code: "MM", latitude: 16.8661, longitude: 96.1951 },
  { name: "加德滿都", en: "Kathmandu", country_zh: "🇳🇵 尼泊爾", country_code: "NP", latitude: 27.7172, longitude: 85.3240 },
  // 印度
  { name: "新德里", en: "New Delhi", country_zh: "🇮🇳 印度", country_code: "IN", latitude: 28.6139, longitude: 77.2090 },
  { name: "孟買", en: "Mumbai", country_zh: "🇮🇳 印度", country_code: "IN", latitude: 19.0760, longitude: 72.8777 },
  { name: "齋浦爾", en: "Jaipur", country_zh: "🇮🇳 印度", country_code: "IN", latitude: 26.9124, longitude: 75.7873 },
  // 中東
  { name: "杜拜", en: "Dubai", country_zh: "🇦🇪 阿聯酋", country_code: "AE", latitude: 25.2048, longitude: 55.2708 },
  { name: "阿布達比", en: "Abu Dhabi", country_zh: "🇦🇪 阿聯酋", country_code: "AE", latitude: 24.4539, longitude: 54.3773 },
  // 中國
  { name: "上海", en: "Shanghai", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 31.2304, longitude: 121.4737 },
  { name: "北京", en: "Beijing", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 39.9042, longitude: 116.4074 },
  { name: "廣州", en: "Guangzhou", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 23.1291, longitude: 113.2644 },
  { name: "成都", en: "Chengdu", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 30.5728, longitude: 104.0668 },
  { name: "西安", en: "Xi'an", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 34.3416, longitude: 108.9398 },
  { name: "桂林", en: "Guilin", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 25.2736, longitude: 110.2991 },
  { name: "麗江", en: "Lijiang", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 26.8721, longitude: 100.2299 },
  { name: "張家界", en: "Zhangjiajie", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 29.1168, longitude: 110.4793 },
  { name: "杭州", en: "Hangzhou", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 30.2741, longitude: 120.1551 },
  { name: "廈門", en: "Xiamen", country_zh: "🇨🇳 中國", country_code: "CN", latitude: 24.4798, longitude: 118.0894 },
  // 法國
  { name: "巴黎", en: "Paris", country_zh: "🇫🇷 法國", country_code: "FR", latitude: 48.8566, longitude: 2.3522 },
  { name: "尼斯", en: "Nice", country_zh: "🇫🇷 法國", country_code: "FR", latitude: 43.7102, longitude: 7.2620 },
  { name: "里昂", en: "Lyon", country_zh: "🇫🇷 法國", country_code: "FR", latitude: 45.7640, longitude: 4.8357 },
  { name: "馬賽", en: "Marseille", country_zh: "🇫🇷 法國", country_code: "FR", latitude: 43.2965, longitude: 5.3698 },
  // 英國
  { name: "倫敦", en: "London", country_zh: "🇬🇧 英國", country_code: "GB", latitude: 51.5074, longitude: -0.1278 },
  { name: "愛丁堡", en: "Edinburgh", country_zh: "🇬🇧 英國", country_code: "GB", latitude: 55.9533, longitude: -3.1883 },
  { name: "曼徹斯特", en: "Manchester", country_zh: "🇬🇧 英國", country_code: "GB", latitude: 53.4808, longitude: -2.2426 },
  // 義大利
  { name: "羅馬", en: "Rome", country_zh: "🇮🇹 義大利", country_code: "IT", latitude: 41.9028, longitude: 12.4964 },
  { name: "米蘭", en: "Milan", country_zh: "🇮🇹 義大利", country_code: "IT", latitude: 45.4654, longitude: 9.1866 },
  { name: "威尼斯", en: "Venice", country_zh: "🇮🇹 義大利", country_code: "IT", latitude: 45.4408, longitude: 12.3155 },
  { name: "佛羅倫斯", en: "Florence", country_zh: "🇮🇹 義大利", country_code: "IT", latitude: 43.7696, longitude: 11.2558 },
  { name: "那不勒斯", en: "Naples", country_zh: "🇮🇹 義大利", country_code: "IT", latitude: 40.8518, longitude: 14.2681 },
  // 西班牙
  { name: "巴塞隆納", en: "Barcelona", country_zh: "🇪🇸 西班牙", country_code: "ES", latitude: 41.3851, longitude: 2.1734 },
  { name: "馬德里", en: "Madrid", country_zh: "🇪🇸 西班牙", country_code: "ES", latitude: 40.4168, longitude: -3.7038 },
  { name: "塞維亞", en: "Seville", country_zh: "🇪🇸 西班牙", country_code: "ES", latitude: 37.3891, longitude: -5.9845 },
  { name: "格拉納達", en: "Granada", country_zh: "🇪🇸 西班牙", country_code: "ES", latitude: 37.1773, longitude: -3.5986 },
  // 荷蘭、比利時
  { name: "阿姆斯特丹", en: "Amsterdam", country_zh: "🇳🇱 荷蘭", country_code: "NL", latitude: 52.3676, longitude: 4.9041 },
  { name: "布魯塞爾", en: "Brussels", country_zh: "🇧🇪 比利時", country_code: "BE", latitude: 50.8503, longitude: 4.3517 },
  { name: "布魯日", en: "Bruges", country_zh: "🇧🇪 比利時", country_code: "BE", latitude: 51.2093, longitude: 3.2247 },
  // 奧地利、瑞士
  { name: "維也納", en: "Vienna", country_zh: "🇦🇹 奧地利", country_code: "AT", latitude: 48.2082, longitude: 16.3738 },
  { name: "薩爾茲堡", en: "Salzburg", country_zh: "🇦🇹 奧地利", country_code: "AT", latitude: 47.8095, longitude: 13.0550 },
  { name: "蘇黎世", en: "Zurich", country_zh: "🇨🇭 瑞士", country_code: "CH", latitude: 47.3769, longitude: 8.5417 },
  { name: "日內瓦", en: "Geneva", country_zh: "🇨🇭 瑞士", country_code: "CH", latitude: 46.2044, longitude: 6.1432 },
  { name: "英特拉肯", en: "Interlaken", country_zh: "🇨🇭 瑞士", country_code: "CH", latitude: 46.6863, longitude: 7.8632 },
  { name: "琉森", en: "Lucerne", country_zh: "🇨🇭 瑞士", country_code: "CH", latitude: 47.0502, longitude: 8.3093 },
  // 德國
  { name: "慕尼黑", en: "Munich", country_zh: "🇩🇪 德國", country_code: "DE", latitude: 48.1351, longitude: 11.5820 },
  { name: "柏林", en: "Berlin", country_zh: "🇩🇪 德國", country_code: "DE", latitude: 52.5200, longitude: 13.4050 },
  { name: "法蘭克福", en: "Frankfurt", country_zh: "🇩🇪 德國", country_code: "DE", latitude: 50.1109, longitude: 8.6821 },
  { name: "科隆", en: "Cologne", country_zh: "🇩🇪 德國", country_code: "DE", latitude: 50.9333, longitude: 6.9500 },
  { name: "漢堡", en: "Hamburg", country_zh: "🇩🇪 德國", country_code: "DE", latitude: 53.5753, longitude: 10.0153 },
  // 捷克、匈牙利、波蘭
  { name: "布拉格", en: "Prague", country_zh: "🇨🇿 捷克", country_code: "CZ", latitude: 50.0755, longitude: 14.4378 },
  { name: "布達佩斯", en: "Budapest", country_zh: "🇭🇺 匈牙利", country_code: "HU", latitude: 47.4979, longitude: 19.0402 },
  { name: "克拉科夫", en: "Krakow", country_zh: "🇵🇱 波蘭", country_code: "PL", latitude: 50.0647, longitude: 19.9450 },
  { name: "華沙", en: "Warsaw", country_zh: "🇵🇱 波蘭", country_code: "PL", latitude: 52.2297, longitude: 21.0122 },
  // 希臘、克羅埃西亞
  { name: "雅典", en: "Athens", country_zh: "🇬🇷 希臘", country_code: "GR", latitude: 37.9838, longitude: 23.7275 },
  { name: "聖托里尼", en: "Santorini", country_zh: "🇬🇷 希臘", country_code: "GR", latitude: 36.3932, longitude: 25.4615 },
  { name: "米克諾斯", en: "Mykonos", country_zh: "🇬🇷 希臘", country_code: "GR", latitude: 37.4467, longitude: 25.3289 },
  { name: "杜布羅夫尼克", en: "Dubrovnik", country_zh: "🇭🇷 克羅埃西亞", country_code: "HR", latitude: 42.6507, longitude: 18.0944 },
  // 葡萄牙、愛爾蘭、冰島
  { name: "里斯本", en: "Lisbon", country_zh: "🇵🇹 葡萄牙", country_code: "PT", latitude: 38.7223, longitude: -9.1393 },
  { name: "波爾圖", en: "Porto", country_zh: "🇵🇹 葡萄牙", country_code: "PT", latitude: 41.1579, longitude: -8.6291 },
  { name: "都柏林", en: "Dublin", country_zh: "🇮🇪 愛爾蘭", country_code: "IE", latitude: 53.3498, longitude: -6.2603 },
  { name: "雷克雅維克", en: "Reykjavik", country_zh: "🇮🇸 冰島", country_code: "IS", latitude: 64.1466, longitude: -21.9426 },
  // 北歐
  { name: "斯德哥爾摩", en: "Stockholm", country_zh: "🇸🇪 瑞典", country_code: "SE", latitude: 59.3293, longitude: 18.0686 },
  { name: "哥本哈根", en: "Copenhagen", country_zh: "🇩🇰 丹麥", country_code: "DK", latitude: 55.6761, longitude: 12.5683 },
  { name: "奧斯陸", en: "Oslo", country_zh: "🇳🇴 挪威", country_code: "NO", latitude: 59.9139, longitude: 10.7522 },
  { name: "赫爾辛基", en: "Helsinki", country_zh: "🇫🇮 芬蘭", country_code: "FI", latitude: 60.1699, longitude: 24.9384 },
  // 土耳其
  { name: "伊斯坦堡", en: "Istanbul", country_zh: "🇹🇷 土耳其", country_code: "TR", latitude: 41.0082, longitude: 28.9784 },
  { name: "卡帕多奇亞", en: "Cappadocia", country_zh: "🇹🇷 土耳其", country_code: "TR", latitude: 38.6431, longitude: 34.8289 },
  { name: "安塔利亞", en: "Antalya", country_zh: "🇹🇷 土耳其", country_code: "TR", latitude: 36.8841, longitude: 30.7056 },
  // 美國
  { name: "紐約", en: "New York", country_zh: "🇺🇸 美國", country_code: "US", latitude: 40.7128, longitude: -74.0060 },
  { name: "洛杉磯", en: "Los Angeles", country_zh: "🇺🇸 美國", country_code: "US", latitude: 34.0522, longitude: -118.2437 },
  { name: "舊金山", en: "San Francisco", country_zh: "🇺🇸 美國", country_code: "US", latitude: 37.7749, longitude: -122.4194 },
  { name: "拉斯維加斯", en: "Las Vegas", country_zh: "🇺🇸 美國", country_code: "US", latitude: 36.1699, longitude: -115.1398 },
  { name: "檀香山", en: "Honolulu", country_zh: "🇺🇸 美國", country_code: "US", latitude: 21.3069, longitude: -157.8583 },
  { name: "芝加哥", en: "Chicago", country_zh: "🇺🇸 美國", country_code: "US", latitude: 41.8781, longitude: -87.6298 },
  { name: "西雅圖", en: "Seattle", country_zh: "🇺🇸 美國", country_code: "US", latitude: 47.6062, longitude: -122.3321 },
  { name: "邁阿密", en: "Miami", country_zh: "🇺🇸 美國", country_code: "US", latitude: 25.7617, longitude: -80.1918 },
  { name: "波士頓", en: "Boston", country_zh: "🇺🇸 美國", country_code: "US", latitude: 42.3601, longitude: -71.0589 },
  { name: "華盛頓DC", en: "Washington DC", country_zh: "🇺🇸 美國", country_code: "US", latitude: 38.9072, longitude: -77.0369 },
  { name: "波特蘭", en: "Portland", country_zh: "🇺🇸 美國", country_code: "US", latitude: 45.5051, longitude: -122.6750 },
  // 加拿大、墨西哥
  { name: "溫哥華", en: "Vancouver", country_zh: "🇨🇦 加拿大", country_code: "CA", latitude: 49.2827, longitude: -123.1207 },
  { name: "多倫多", en: "Toronto", country_zh: "🇨🇦 加拿大", country_code: "CA", latitude: 43.6532, longitude: -79.3832 },
  { name: "蒙特婁", en: "Montreal", country_zh: "🇨🇦 加拿大", country_code: "CA", latitude: 45.5017, longitude: -73.5673 },
  { name: "坎昆", en: "Cancun", country_zh: "🇲🇽 墨西哥", country_code: "MX", latitude: 21.1619, longitude: -86.8515 },
  { name: "墨西哥城", en: "Mexico City", country_zh: "🇲🇽 墨西哥", country_code: "MX", latitude: 19.4326, longitude: -99.1332 },
  // 澳洲、紐西蘭
  { name: "雪梨", en: "Sydney", country_zh: "🇦🇺 澳洲", country_code: "AU", latitude: -33.8688, longitude: 151.2093 },
  { name: "墨爾本", en: "Melbourne", country_zh: "🇦🇺 澳洲", country_code: "AU", latitude: -37.8136, longitude: 144.9631 },
  { name: "布里斯本", en: "Brisbane", country_zh: "🇦🇺 澳洲", country_code: "AU", latitude: -27.4698, longitude: 153.0251 },
  { name: "黃金海岸", en: "Gold Coast", country_zh: "🇦🇺 澳洲", country_code: "AU", latitude: -28.0167, longitude: 153.4000 },
  { name: "凱恩斯", en: "Cairns", country_zh: "🇦🇺 澳洲", country_code: "AU", latitude: -16.9186, longitude: 145.7781 },
  { name: "奧克蘭", en: "Auckland", country_zh: "🇳🇿 紐西蘭", country_code: "NZ", latitude: -36.8485, longitude: 174.7633 },
  { name: "皇后鎮", en: "Queenstown", country_zh: "🇳🇿 紐西蘭", country_code: "NZ", latitude: -45.0312, longitude: 168.6626 },
  { name: "基督城", en: "Christchurch", country_zh: "🇳🇿 紐西蘭", country_code: "NZ", latitude: -43.5321, longitude: 172.6362 },
  // 非洲
  { name: "開羅", en: "Cairo", country_zh: "🇪🇬 埃及", country_code: "EG", latitude: 30.0444, longitude: 31.2357 },
  { name: "馬拉喀什", en: "Marrakech", country_zh: "🇲🇦 摩洛哥", country_code: "MA", latitude: 31.6295, longitude: -7.9811 },
  { name: "開普敦", en: "Cape Town", country_zh: "🇿🇦 南非", country_code: "ZA", latitude: -33.9249, longitude: 18.4241 },
];

export const CAT_COLORS = {
  "exp.cat_food": "#E8A87C",
  "exp.cat_transport": "#95B8D1",
  "exp.cat_ticket": "#B5C4B1",
  "exp.cat_shopping": "#F4A7B9",
  "exp.cat_stay": "#C3B1E1",
  "exp.cat_other": "#C4A882",
};
const FALLBACK_COLORS = ["#E8A87C", "#95B8D1", "#B5C4B1", "#F4A7B9", "#C3B1E1", "#F2D0A4", "#D4A5A5"];
export const getCatColor = (cat, index = 0) => CAT_COLORS[cat] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
