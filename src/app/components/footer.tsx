
"use client"

import Link from "next/link"
import { Coffee, Instagram, Facebook, Twitter } from "lucide-react"
import { motion } from "framer-motion"

export default function Footer() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className="bg-black text-white"
    >
      <div className="container px-4 py-12 md:px-6 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-7xl mx-auto">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 400 }}>
                <Coffee className="h-6 w-6 text-brown-400" />
              </motion.div>
              <span className="text-xl font-bold">Zelin Café</span>
            </div>
            <p className="text-gray-400">
              Crafting exceptional coffee experience since 2020. Our passion is in every cup.
            </p>
            <div className="flex space-x-4">
              <motion.div whileHover={{ scale: 1.2, color: "#E1306C" }}>
                <Link href="https://www.instagram.com/zelincafe/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brown-400">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.2, color: "#1877F2" }}>
                <Link href="https://www.facebook.com/zelincafe/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brown-400">
                  <Facebook className="h-5 w-5" />
                  <span className="sr-only">Facebook</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wider">Company</h3>
            <ul className="space-y-2">
              <motion.li whileHover={{ x: 5 }}>
                <Link href="/about" className="text-gray-400 hover:text-brown-400">
                  About Us
                </Link>
              </motion.li>
            </ul>
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wider">Visit Us</h3>
            <p className="text-gray-400">
              Parañaque, Philippines
            </p>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link
                href="https://www.google.com/maps/place/F2F4%2B576+Lombos+St,+Para%C3%B1aque,+1700+Metro+Manila/@14.476000789900001,121.012315315343,17z"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-brown-400 hover:underline"
              >
                Get Directions
              </Link>
            </motion.div>
          </motion.div>
        </div>
        <motion.div
          variants={itemVariants}
          className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-400"
        >
          <p>© {new Date().getFullYear()} Zelin Café. All rights reserved.</p>
        </motion.div>
      </div>
    </motion.footer>
  )
}