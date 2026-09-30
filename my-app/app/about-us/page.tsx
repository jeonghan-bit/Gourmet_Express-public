import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Phone, Clock, Users, Award, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import logo from "../../public/logo.webp";
import landing_photo from "../../public/landing_photo.webp";
import about_photo from "../../public/about_photo.webp";
import menu1_photo from "../../public/menu1.webp";
import { STORE_CONFIG } from "@/lib/storeConfig";
import menu2_photo from "../../public/menu2.webp";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
        <Image
          src={landing_photo}
          alt="Gourmet Express Chinese Food"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              About Gourmet Express
            </h1>
            <p className="text-xl md:text-2xl">
              Authentic Chinese Cuisine Since 1995
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Quick Actions */}
        <section className="max-w-4xl mx-auto bg-white rounded-lg p-8 shadow-sm mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Order Now</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3">
                Order Online
              </Button>
            </Link>
            <Link href="https://www.skipthedishes.com/gourmet-express-chinese-food">
              <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3">
                Order with Skip
              </Button>
            </Link>
            <Link href="https://www.ubereats.com/ca/store/chinese-gourmet-express/wJEs0E9KTL67Vs3UiCzbQA?srsltid=AfmBOopnvnCQtADSmcYoVJWzcd9j-ejpz_917w9Mpt36p2O9eXK3vj4L">
              <Button className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white px-8 py-3">
                Order with Uber Eats
              </Button>
            </Link>
          </div>
        </section>

        {/* About Us Story */}
        <section id="history" className="max-w-6xl mx-auto mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  For over 25 years, Gourmet Express has been serving the
                  Toronto community with authentic Chinese cuisine that brings
                  families together around the dinner table.
                </p>
                <p>
                  Located in the heart of Etobicoke at {STORE_CONFIG.address.street},
                  we&apos;ve built our reputation on fresh ingredients,
                  traditional cooking methods, and exceptional customer service.
                </p>
                <p>
                  Our menu features more than one hundred different dishes, from
                  classic Cantonese favorites to spicy Szechuan specialties,
                  ensuring there&apos;s something for every palate and dietary
                  preference.
                </p>
              </div>
            </div>
            <div className="relative h-[400px] w-full rounded-lg overflow-hidden shadow-lg">
              <Image
                src={about_photo}
                alt="Gourmet Express Restaurant"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section id="mission" className="max-w-6xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle>Quality First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We use only the freshest ingredients and traditional cooking
                  methods to ensure every dish meets our high standards.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <CardTitle>Community Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We&apos;re proud to be part of the Toronto community, serving
                  families and creating memories one meal at a time.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Award className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <CardTitle>Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our commitment to excellence has earned us a loyal customer
                  base and recognition as one of Toronto&apos;s top Chinese
                  restaurants.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Menu Preview */}
        <section id="ingredients" className="max-w-6xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Our Menu
          </h2>
          <div className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={menu1_photo}
                  alt="Gourmet Express Menu Page 1"
                  className="h-auto w-full"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={menu2_photo}
                  alt="Gourmet Express Menu Page 2"
                  className="h-auto w-full"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Extensive Selection
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Our comprehensive menu features over 100 authentic Chinese
                  dishes, carefully crafted to satisfy every craving and dietary
                  need.
                </p>
                <div className="mx-auto grid max-w-2xl gap-8 sm:grid-cols-2 mt-6 text-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Popular Dishes:
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Cantonese Chow Mein</li>
                      <li>• Szechuan Shrimp</li>
                      <li>• Yu Shiang Broccoli</li>
                      <li>• Sweet & Sour Pork</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Special Diets:
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Vegetarian Options</li>
                      <li>• Gluten-Free Dishes</li>
                      <li>• Low-Sodium Choices</li>
                      <li>• Spice Level Options</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Location & Hours */}
        <section id="community" className="max-w-6xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Visit Us
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  Location & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-gray-900">Address:</p>
                  <p className="text-gray-700">
                    {STORE_CONFIG.address.street}
                    <br />
                    {STORE_CONFIG.address.city}, {STORE_CONFIG.address.province}{" "}
                    {STORE_CONFIG.address.postalCode}
                    <br />
                    {STORE_CONFIG.address.country}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Phone:</p>
                  <a
                    href={`tel:${STORE_CONFIG.phone.href}`}
                    className="text-primary hover:underline"
                  >
                    {STORE_CONFIG.phone.display}
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Rating:</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      4.5/5 stars
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Hours of Operation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Monday:</span>
                    <span className="text-gray-900">11:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tuesday:</span>
                    <span className="text-gray-500">Closed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Wednesday:</span>
                    <span className="text-gray-900">11:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Thursday - Saturday:</span>
                    <span className="text-gray-900">11:00 AM - 11:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Sunday:</span>
                    <span className="text-gray-900">12:00 PM - 10:00 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Delivery Areas */}
        <section className="max-w-6xl mx-auto mb-16">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="text-center py-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-primary">
                  Want to order delivery?
                </h2>
                <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                  Call us directly for delivery orders throughout the Greater
                  Toronto Area
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href={`tel:${STORE_CONFIG.phone.href}`}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg text-xl font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    {STORE_CONFIG.phone.display}
                  </a>
                </div>
                {/* <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">
                    We deliver to these postal codes:
                  </p>
                  <p className="text-xs leading-relaxed max-w-4xl mx-auto">
                    L4H, L4L, L4T, L4V, L4W, L4X, L4Y, L4Z, L5A, L5B, L5E, L5R,
                    L5W, L6S, M3L, M3M, M3N, M6B, M6L, M6M, M6N, M6P, M6S, M8V,
                    M8W, M8X, M8Y, M8Z, M9A, M9B, M9C, M9L, M9M, M9N, M9P, M9R,
                    M9V, M9W
                  </p>
                </div> */}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="max-w-4xl mx-auto text-center bg-primary/5 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Experience Authentic Chinese Cuisine?
          </h2>
          <p className="text-gray-600 mb-6">
            Join thousands of satisfied customers who have made Gourmet Express
            their go-to choice for Chinese food.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                Order Now
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Contact Us
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
