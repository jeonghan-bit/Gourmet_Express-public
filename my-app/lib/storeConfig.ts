export const STORE_CONFIG = {
  name: "Gourmet Express",
  address: {
    street: "1735 Kipling Ave",
    city: "Etobicoke",
    province: "ON",
    postalCode: "M9R 2Y8",
    country: "Canada",
    formatted: "1735 Kipling Ave, Etobicoke, ON M9R 2Y8",
    location: {
      latitude: 43.69306110945266,
      longitude: -79.55729663547153,
    },
  },
  phone: {
    display: "(416) 240-9933",
    href: "+14162409933",
  },
  email: "Gourmetexpress.kipling@gmail.com",
  timeZone: "America/Toronto",
  websiteUrl: "https://gourmet-express-kipling.com",
  googleMapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2884.1234567890123!2d-79.5598782874548!3d43.69299584973437!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b3754d14b4147%3A0x6e049e77b1f2d83a!2sGourmet%20Express!5e0!3m2!1sen!2sca!4v1731293253825!5m2!1sen!2sca",
  autocompleteBiasRadiusMetres: 30_000,
} as const;

export const STORE_MAP_SEARCH_QUERY =
  `${STORE_CONFIG.name}, ${STORE_CONFIG.address.formatted}`;
