import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import logo from "../public/logo.webp";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {/* Contact Us */}
          <div className="mb-8 md:mb-0">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact#location"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Location
                </Link>
              </li>
              <li>
                <Link
                  href="/contact#hours"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Hours
                </Link>
              </li>
              <li>
                <Link
                  href="/contact#phone"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Phone
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="mb-8 md:mb-0">
            <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Online Ordering
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Delivery
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pickup / Dine-In
                </Link>
              </li>
              <li>
                <Link
                  href="/orders-history"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Order History
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Food */}
          <div className="mb-8 md:mb-0">
            <h3 className="font-semibold text-gray-900 mb-4">Our Food</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us#ingredients"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Fresh Ingredients
                </Link>
              </li>
              {/* <li>
                <Link
                  href="/about-us#quality"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Quality Promise
                </Link>
              </li> */}
              {/* <li>
                <Link
                  href="/about-us#nutrition"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Nutrition Info
                </Link>
              </li> */}
            </ul>
          </div>

          {/* Community */}
          {/* <div>
            <h3 className="font-semibold text-gray-900 mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about-us#community"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Local Community
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us#events"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us#catering"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Catering
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us#reviews"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Customer Reviews
                </Link>
              </li>
            </ul>
          </div> */}

          {/* About Us */}
          <div className="mb-8 md:mb-0">
            <h3 className="font-semibold text-gray-900 mb-4">About Us</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about-us"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us#history"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Our History
                </Link>
              </li>
              {/* <li>
                <Link
                  href="/about-us#team"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Our Team
                </Link>
              </li> */}
              <li>
                <Link
                  href="/about-us#mission"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Our Mission
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6">
              <Link
                href="/privacy-policy"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/accessibility"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Accessibility
              </Link>
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="text-2xl font-bold text-primary">
                <Image
                  src={logo}
                  alt="Gourmet Express"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </div>
              <div className="text-gray-600 text-center md:text-left text-sm">
                © 2025 Gourmet Express All Rights Reserved
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
