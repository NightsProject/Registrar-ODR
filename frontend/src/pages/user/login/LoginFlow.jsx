import { useState } from "react";
import EnterId from "./EnterId";
import OtpVerification from "../OtpVerification";
import LiabilityDetected from "./LiabilityDetected";

function LoginFlow() {
  const [step, setStep] = useState("enter-id");
  const [maskedPhone, setMaskedPhone] = useState("**");
  const [otp, setOtp] = useState("");

  const goNext = (nextStep) => {
    if (nextStep) {
      setStep(nextStep);
    } else {
      if (step === "enter-id") setStep("otp");
      else if (step === "otp") setStep("liability");
    }
  };

  const goBack = () => {
    if (step === "otp") setStep("enter-id");
    else if (step === "enter-id") setStep("enter-id");
    else if (step === "liability") setStep("enter-id");
  };

  return (
    <>
      {step === "enter-id" && <EnterId onNext={goNext} onBack={goBack} setMaskedPhone={setMaskedPhone} setOtp={setOtp} />}
      {step === "otp" && <OtpVerification onNext={goNext} onBack={goBack} maskedPhone={maskedPhone} setMaskedPhone={setMaskedPhone} otp={otp} />}
      {step === "liability" && <LiabilityDetected onNext={goNext} onBack={goBack} />}
    </>
  );
}

export default LoginFlow;
