// Static footer — attached to end of page content.
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100 mt-8">
      © {year} Rental Manager. All rights reserved.
    </footer>
  );
}
