import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Roulette", to: "/" },
      { label: "Models", to: "/models" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Latina", to: "/models?category=latina" },
      { label: "Asian", to: "/models?category=asian" },
      { label: "Blonde", to: "/models?category=blonde" },
      { label: "Couples", to: "/models?category=couples" },
      { label: "Trans", to: "/models?category=trans" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About xcam.vip", to: "#" },
      { label: "Privacy Policy", to: "#" },
      { label: "Terms of Service", to: "#" },
      { label: "18 USC 2257", to: "#" },
      { label: "Contact", to: "#" },
    ],
  },
];

const ContentFooter = () => (
  <footer className="bg-[hsl(var(--bg-tinted))] border-t border-[hsl(var(--border))]">
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {footerSections.map((section) => (
          <div key={section.title}>
            <h4 className="text-sm font-semibold text-foreground mb-4">{section.title}</h4>
            <ul className="space-y-2.5">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-xs text-[hsl(var(--text-tertiary))] hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-4">Follow</h4>
          <ul className="space-y-2.5">
            {["Twitter / X", "Instagram", "Reddit"].map((label) => (
              <li key={label}>
                <a href="#" className="text-xs text-[hsl(var(--text-tertiary))] hover:text-foreground transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    <div className="border-t border-[hsl(var(--border))] py-4 text-center">
      <p className="text-[11px] text-[hsl(var(--text-tertiary))]">
        © 2026 xcam.vip — All rights reserved
      </p>
    </div>
  </footer>
);

export default ContentFooter;
