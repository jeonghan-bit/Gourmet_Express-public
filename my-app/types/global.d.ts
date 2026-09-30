export {};

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}
