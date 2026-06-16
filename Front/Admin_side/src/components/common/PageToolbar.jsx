import { NavLink } from "react-router-dom";

function PageToolbar({ pageKey, children }) {
  return <div className={`${pageKey}-toolbar`}>{children}</div>;
}

export function ToolbarLink({ pageKey, to, children, variant = "secondary", end }) {
  const variantClass = variant === "primary" ? ` ${pageKey}-toolbar-link--primary` : "";
  return (
    <NavLink
      end={end}
      to={to}
      className={({ isActive }) =>
        `${pageKey}-toolbar-link${variantClass}${isActive ? ` ${pageKey}-toolbar-link--active` : ""}`
      }
    >
      {children}
    </NavLink>
  );
}

export default PageToolbar;
