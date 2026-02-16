import ContentNavbar from "./ContentNavbar";
import ContentFooter from "./ContentFooter";

const ContentLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[hsl(var(--bg-tinted))]">
    <ContentNavbar />
    <main className="pt-14">{children}</main>
    <ContentFooter />
  </div>
);

export default ContentLayout;
