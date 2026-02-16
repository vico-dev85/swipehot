import { useState, useEffect } from "react";
import AgeGate from "@/components/AgeGate";
import StartScreen from "@/components/StartScreen";
import RouletteView from "@/components/RouletteView";

type Screen = "age-gate" | "splash" | "roulette";

const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => {
    return getCookie("xcam_age_verified") ? "splash" : "age-gate";
  });

  return (
    <>
      {screen === "age-gate" && <AgeGate onEnter={() => setScreen("splash")} />}
      {screen === "splash" && <StartScreen onStart={() => setScreen("roulette")} />}
      {screen === "roulette" && <RouletteView />}
    </>
  );
};

export default Index;
