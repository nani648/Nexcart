import Link from "next/link";
import { Package, Twitter, Instagram, Facebook, Youtube, Mail } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/919876543210?text=Hi%20NexCart%20Support%2C%20I%20need%20help%20with%20my%20order.";

const COLS = [
  { t:"Company", ls:[{l:"About Us",h:"/about"},{l:"Careers",h:"/careers"},{l:"Press",h:"/press"},{l:"Blog",h:"/blog"}] },
  { t:"Customer", ls:[{l:"My Orders",h:"/orders"},{l:"Wishlist",h:"/wishlist"},{l:"Returns",h:"/returns"},{l:"Help Center",h:"/help"}] },
  { t:"Sellers", ls:[{l:"Sell on NexCart",h:"/become-seller"},{l:"Seller Login",h:"/sign-in"},{l:"Pricing Plans",h:"/pricing"},{l:"Seller Guide",h:"/help"}] },
  { t:"Legal", ls:[{l:"Privacy Policy",h:"/privacy"},{l:"Terms of Service",h:"/terms"},{l:"Refund & Shipping",h:"/refund-policy"},{l:"Cookie Policy",h:"/cookies"},{l:"Sitemap",h:"/sitemap.xml"}] },
];
const SOCIALS = [Twitter, Instagram, Facebook, Youtube, Mail];
const PAY = ["Visa","Mastercard","UPI","Net Banking","Razorpay"];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="wrap py-8 md:py-12">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5 lg:gap-8">
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary shadow-sm">
                <Package className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[18px] font-extrabold tracking-tight">Nex<span className="text-primary">Cart</span></span>
            </Link>
            <p className="mb-4 text-[13px] text-white/70 leading-relaxed">India&apos;s most trusted multi-vendor marketplace — connecting verified sellers with millions of buyers.</p>
            <div className="flex gap-2 flex-wrap">
              {SOCIALS.map((Icon, i) => (
                <a key={i} href="#" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/60 hover:border-white hover:text-white transition-colors tap-target">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map(col => (
            <div key={col.t}>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">{col.t}</h4>
              <ul className="space-y-2">
                {col.ls.map(({ l, h }) => (
                  <li key={h}><Link href={h} className="text-[13px] text-white/70 hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-5 sm:flex-row text-center sm:text-left">
          <p className="text-[12px] text-white/50" suppressHydrationWarning>© {new Date().getFullYear()} NexCart Technologies Pvt. Ltd. All rights reserved.</p>
          {/* WhatsApp Contact */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-[#1ebe5d] hover:shadow-md"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contact us on WhatsApp
          </a>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[11px] text-white/40">We accept:</span>
            {PAY.map(p => (
              <span key={p} className="rounded-lg border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/70">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
