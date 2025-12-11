import { useState } from "react";
import EnterId from "./EnterId";
import EnterName from "./EnterName";
import OtpVerification from "../OtpVerification";
import LiabilityDetected from "./LiabilityDetected";
import VerificationOptions from "./VerificationOptions";
import RequestInBehalf from "./RequestInBehalf";

function LoginFlow() {
  const [step, setStep] = useState("verification-options");
  const [maskedPhone, setMaskedPhone] = useState("**");
  const [otp, setOtp] = useState("");
  const [lastEntry, setLastEntry] = useState(null); 
  const [studentId, setStudentId] = useState(null); 

  const goNext = (nextStep, id = null) => {
    if (id) setStudentId(id);

    if (nextStep) {
      setStep(nextStep);
      return;
    }

    if (step === "enter-id" || step === "enter-name" || step === "request-in-behalf") {
      setLastEntry(step);
      setStep("otp");
    } else if (step === "otp") {
      setStep("liability");
    }
  };

  const goBack = () => {
    if (step === "otp") {
      if (lastEntry === "enter-name") setStep("enter-name");
      else if (lastEntry === "request-in-behalf") setStep("request-in-behalf");
      else setStep("enter-id");
    } else if (step === "enter-name") {
      setStep("verification-options");
    } else if (step === "request-in-behalf") {
      setStep("verification-options");
    } else if (step === "liability") {
      setStep("verification-options");
    } else {
      setStep("verification-options");
    }
  };

  const goBackToOptions = () => {
    setStep("verification-options");
  };

  return (
    <>
      {step === "verification-options" && (
        <VerificationOptions onNext={goNext} onBack={goBack} />
      )}

      {step === "enter-id" && (
        <EnterId
          onNext={goNext}
          onBack={goBack}
          setMaskedPhone={setMaskedPhone}
          setStudentId={setStudentId}
          goBackToOptions={goBackToOptions}
        />
      )}

      {step === "enter-name" && (
        <EnterName
          onNext={goNext}
          onBack={goBack}
          setMaskedPhone={setMaskedPhone}
          goBackToOptions={goBackToOptions}
        />
      )}

      {step === "request-in-behalf" && (
        <RequestInBehalf
          onNext={goNext}
          onBack={goBack}
          setMaskedPhone={setMaskedPhone}
          goBackToOptions={goBackToOptions}
        />
      )}

      {step === "otp" && (
        <OtpVerification
          onNext={goNext}
          onBack={goBack}
          maskedPhone={maskedPhone}
          setMaskedPhone={setMaskedPhone}
          studentId={studentId}
        />
      )}

      {step === "liability" && (
        <LiabilityDetected onNext={goNext} onBack={goBack} />
      )}
    </>
  );
}

export default LoginFlow;