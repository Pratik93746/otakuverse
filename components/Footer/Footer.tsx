import Link from 'next/link';
import { Share2, ExternalLink, MessageCircle, ArrowRight } from 'lucide-react';

const footerLinks = {
  shop: [
    { label: 'Anime Figures', href: '/shop?category=anime-figures' },
    { label: 'Action Figures', href: '/shop?category=action-figures' },
    { label: 'Statues', href: '/shop?category=statues' },
    { label: 'New Arrivals', href: '/shop?filter=new' },
    { label: 'Best Sellers', href: '/shop?filter=bestsellers' },
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
    { label: 'About OTAKUVERSE', href: '/about' },
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
            <Link href="/" className="inline-block mb-4">
              <span className="font-heading text-3xl tracking-[0.15em] text-white hover:text-brand-red transition-colors">
                OTAKUVERSE
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
              Bring your favorite anime characters to life. Premium collectibles,
              figures, and statues for true fans and collectors.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
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
            © {new Date().getFullYear()} OTAKUVERSE. All rights reserved.
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
