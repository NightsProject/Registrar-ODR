import { useNavigate } from "react-router-dom";
import "./Login.css";

function VerificationOptions({ onNext }) {

  return (
    <div className="options-container">
      <h1 className="title">Choose how you want to Authenticate</h1>

      <div className="cards-wrapper">

        {/* Option 1: Enter Name */}
        <div className="option-item" onClick={() => onNext("enter-name")}>
          <img src="/assets/UserCheckIcon.svg" alt="" />
          <div className="text-section">
              <h3 className="title">Verify with <br />Student Name</h3>
          </div>
        </div>

        {/* Option 2: Enter ID */}
        <div className="option-item" onClick={() => onNext("enter-id")}>
          <img src="/assets/Hash.svg" alt="" />
          <div className="text-section">
              <h3 className="title">Verify with <br />Student ID</h3>
          </div>
        </div>

        {/* Option 3: Request in Behalf */}
        <div className="option-item" onClick={() => onNext("request-in-behalf")}>
          <img src="/assets/FrontHand.svg" alt="" />
          <div className="text-section">
            <h3 className="title">Request on Behalf <br /> of a Student</h3>
          </div>
        </div>

      </div>
    </div>
  );
}

export default VerificationOptions;
