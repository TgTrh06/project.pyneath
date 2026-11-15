import "./site.css";
import { ThemeSelect } from "../../theme/ThemeSelect";

export function SiteFooter({ showTheme = true }: { showTheme?: boolean }) {
  const scrollToTop = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
  };

  return <footer className="public-footer public-container">
    <div className="public-footer-inner public-inner">
      <a className="public-footer-brand" href="#home">Pyneath.</a>
      <p>Một khoảng yên. Một bước nhỏ.</p>
      <div className="public-footer-actions">
        {showTheme && <ThemeSelect/>}
        <button className="public-footer-top" type="button" onClick={scrollToTop}>Về đầu trang</button>
      </div>
    </div>
  </footer>;
}
