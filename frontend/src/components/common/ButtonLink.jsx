import { useNavigate } from "react-router-dom";
import "./ButtonLink.css";

function ButtonLink({
  to,
  placeholder,
  className,
  variant = "primary",
  onClick,
  disabled
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (disabled) return;

    if (onClick) {
      onClick(e); // pass the event forward
    } else if (to) {
      navigate(to);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`button-link ${variant} ${className ? className : ""}`}
      disabled={disabled}
    >
      {placeholder}
    </button>
  );
}

export default ButtonLink;
