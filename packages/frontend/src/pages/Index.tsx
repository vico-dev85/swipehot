import { useState, useEffect } from "react";
import AgeGate from "@/components/AgeGate";
import StartScreen from "@/components/StartScreen";
import RouletteView from "@/components/RouletteView";
import { tracker } from "@/services/tracker";
import { getSessionNumber, incrementSessionNumber } from "@/services/session";
import { fetchConfig } from "@/services/api";
import { getVariants, getVariant, type ABTestDef } from "@/services/ab";

type Screen = "age-gate" | "splash" | "roulette";

const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => {
    return getCookie("xcam_age_verified") ? "splash" : "age-gate";
  });

  // Fetch config + assign A/B variants on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchConfig();
        if (cancelled) return;
        // Assign variants for all active tests
        getVariants(cfg.ab_tests as ABTestDef[]);
      } catch { /* config fetch failed — run without A/B tests */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Track page load
  useEffect(() => {
    const sessionNum = getSessionNumber();
    tracker.track("page_loaded", {
      landing_page: window.location.pathname,
      is_returning: sessionNum > 1,
      session_number: sessionNum,
    });
  }, []);

  // Apply start_screen A/B test: "instant" variant skips splash → goes straight to roulette
  const handleAgeGatePassed = () => {
    tracker.track("age_gate_passed", { remembered: !!getCookie("xcam_age_verified") });
    const startScreenVariant = getVariant("start_screen");
    if (startScreenVariant === "instant") {
      startSession();
    } else {
      setScreen("splash");
    }
  };

  const startSession = () => {
    tracker.track("start_clicked", {});
    incrementSessionNumber();
    tracker.track("session_started", {
      is_returning: getSessionNumber() > 1,
      session_number: getSessionNumber(),
    });
    setScreen("roulette");
  };

  return (
    <>
      {screen === "age-gate" && <AgeGate onEnter={handleAgeGatePassed} />}
      {screen === "splash" && <StartScreen onStart={startSession} />}
      {screen === "roulette" && <RouletteView />}
    </>
  );
};

export default Index;
