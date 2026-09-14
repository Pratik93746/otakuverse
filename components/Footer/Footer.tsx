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

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
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
              <div className="flex items-start gap-2">
                <WhatsAppIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-gray-300">
                    <a
                      href="https://wa.me/919871452380?text=Hi%20BAKA!%20I%20have%20an%20inquiry%20regarding%20products%20or%20orders."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 hover:underline transition-colors flex items-center gap-1"
                      title="Click to chat on WhatsApp (+91 9871452380)"
                    >
                      +91 9871452380
                    </a>
                    <span className="text-gray-500">/</span>
                    <a
                      href="https://wa.me/919971977012?text=Hi%20BAKA!%20I%20have%20an%20inquiry%20regarding%20products%20or%20orders."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 hover:underline transition-colors flex items-center gap-1"
                      title="Click to chat on WhatsApp (+91 9971977012)"
                    >
                      +91 9971977012
                    </a>
                  </div>
                  <span className="text-[10px] text-emerald-400/90 font-sans flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Click either number to chat on WhatsApp
                  </span>
                </div>
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
