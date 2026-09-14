import Link from 'next/link';
import Image from 'next/image';
import { Share2, ExternalLink, MessageCircle, ArrowRight, Phone, Truck, MapPin } from 'lucide-react';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const footerLinks = {
  shop: [
    { label: 'Figures', href: '/shop?category=figures' },
    { label: 'Katanas', href: '/shop?category=katanas' },
    { label: 'Keychains', href: '/shop?category=keychains' },
    { label: 'Clothing', href: '/shop?category=clothing' },
    { label: 'Collectables', href: '/shop?category=collectables' },
  ],
  account: [
    { label: 'Hunter Sign In', href: '/login' },
    { label: '3D Domain Realm', href: '/login-realm' },
    { label: 'Create Account', href: '/signup' },
    { label: 'My Orders', href: '/account/orders' },
    { label: 'Saved Wishlist', href: '/wishlist' },
  ],
  help: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'Shipping Policy', href: '/shipping' },
    { label: 'Returns & Exchange', href: '/returns' },
    { label: 'Track Order', href: '/account/orders' },
    { label: 'FAQ', href: '/faq' },
  ],
  company: [
    { label: 'About BAKA', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-black text-white">
      {/* Main Footer */}
      <div className="container-wide py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4 group">
              <Image
                src="/custom/baka_header_brand.png"
                alt="BAKA - Clothing Style And More"
                width={340}
                height={93}
                className="h-16 sm:h-20 w-auto object-contain transition-all duration-300 group-hover:brightness-125 group-hover:drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]"
              />
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xs mb-4">
              Official Japanese streetwear, authentic Nichirin katanas, spinners, figures and rare collectibles delivered PAN India.
            </p>

            {/* Poster Contact info */}
            <div className="space-y-2 mb-6 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="font-bold tracking-wider">PAN INDIA DELIVERY</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-red shrink-0" />
                <span className="font-mono text-gray-300">+91 9871452380 / +91 9971977012</span>
              </div>
              <div className="flex items-center gap-2">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <a
                  href="https://instagram.com/its_baka.style"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-gray-200 hover:text-pink-400 transition-colors"
                >
                  @ITS_BAKA.STYLE
                </a>
              </div>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/its_baka.style"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 border border-gray-700 flex items-center justify-center hover:border-brand-red hover:bg-brand-red transition-all duration-200 group"
                aria-label="Instagram"
              >
                <Share2 className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 border border-gray-700 flex items-center justify-center hover:border-brand-red hover:bg-brand-red transition-all duration-200 group"
                aria-label="YouTube"
              >
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
              <a
                href="https://discord.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 border border-gray-700 flex items-center justify-center hover:border-brand-red hover:bg-brand-red transition-all duration-200 group"
                aria-label="Discord"
              >
                <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
            </div>

            {/* Newsletter */}
            <div className="mt-8">
              <p className="font-heading text-lg tracking-wider mb-3">
                JOIN THE COLLECTOR CLUB
              </p>
              <p className="text-gray-400 text-xs mb-3">
                Get exclusive deals, new arrivals & collector tips.
              </p>
              <form className="flex flex-col xs:flex-row gap-2 xs:gap-0">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-4 py-2.5 bg-gray-900 border border-gray-700 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-red transition-colors w-full"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-brand-red text-white hover:bg-brand-red-dark transition-colors flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase whitespace-nowrap"
                >
                  Subscribe
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <p className="font-heading text-lg tracking-widest uppercase mb-5 text-white">
              Shop
            </p>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1 duration-150 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account / Portal Links */}
          <div>
            <p className="font-heading text-lg tracking-widest uppercase mb-5 text-white">
              Portal
            </p>
            <ul className="space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1 duration-150 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <p className="font-heading text-lg tracking-widest uppercase mb-5 text-white">
              Help
            </p>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1 duration-150 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <p className="font-heading text-lg tracking-widest uppercase mb-5 text-white">
              Company
            </p>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1 duration-150 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container-wide py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} BAKA STYLE. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Made with ❤️ for collectors
            </span>
            <div className="flex items-center gap-2">
              {/* Payment icons - text representation */}
              {['UPI', 'Cards', 'COD'].map((method) => (
                <span
                  key={method}
                  className="px-2 py-0.5 border border-gray-700 text-[10px] text-gray-500 font-medium"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
