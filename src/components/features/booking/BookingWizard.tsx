"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ReviewStep } from "@/components/features/booking/ReviewStep";
import { ServiceStep } from "@/components/features/booking/ServiceStep";
import {
  SlotStep,
  slotsQueryKey,
} from "@/components/features/booking/SlotStep";
import {
  StepIndicator,
  type WizardStep,
} from "@/components/features/booking/StepIndicator";
import { StylistStep } from "@/components/features/booking/StylistStep";
import type { Salon, Service, Stylist } from "@/lib/api";
import { lagosToday } from "@/lib/time";

type BookingWizardProps = {
  salon: Salon;
  services: Service[];
  stylists: Stylist[];
  /** A valid ?service= from the URL, or null. */
  initialServiceId: string | null;
};

export function BookingWizard({
  salon,
  services,
  stylists,
  initialServiceId,
}: BookingWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>(
    initialServiceId ? "stylist" : "service",
  );
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId);
  const [stylistId, setStylistId] = useState<string | null>(null);
  const [date, setDate] = useState(() => lagosToday());
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Move focus to the new step's heading so keyboard and screen-reader users
  // hear which step they are on.
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    panelRef.current?.querySelector<HTMLElement>("h1, h2")?.focus();
  }, [step]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const stylist = stylists.find((s) => s.id === stylistId) ?? null;

  function goTo(next: WizardStep) {
    setNotice(null);
    setStep(next);
  }

  function chooseService(id: string) {
    if (id === serviceId) return;
    setServiceId(id);
    setStylistId(null);
    setSlot(null);
  }

  function slotTaken(message: string) {
    if (stylistId && serviceId) {
      void queryClient.invalidateQueries({
        queryKey: slotsQueryKey(stylistId, serviceId, date),
      });
    }
    setSlot(null);
    setNotice(message);
    setStep("slot");
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator current={step} />
      <div ref={panelRef}>
        {step === "service" ? (
          <ServiceStep
            services={services}
            deposit={salon.deposit_amount}
            selectedId={serviceId}
            onSelect={chooseService}
            onContinue={() => goTo("stylist")}
          />
        ) : null}

        {step === "stylist" && serviceId ? (
          <StylistStep
            stylists={stylists}
            serviceId={serviceId}
            salonId={salon.id}
            selectedId={stylistId}
            onSelect={(id) => {
              if (id === stylistId) return;
              setStylistId(id);
              setSlot(null);
            }}
            onContinue={() => goTo("slot")}
            onBack={() => goTo("service")}
          />
        ) : null}

        {step === "slot" && serviceId && stylistId ? (
          <SlotStep
            stylistId={stylistId}
            serviceId={serviceId}
            date={date}
            slot={slot}
            notice={notice}
            onDateChange={(value) => {
              setDate(value);
              setSlot(null);
              setNotice(null);
            }}
            onSlotChange={(value) => {
              setSlot(value);
              setNotice(null);
            }}
            onContinue={() => goTo("review")}
            onBack={() => goTo("stylist")}
          />
        ) : null}

        {step === "review" && service && stylist && slot ? (
          <ReviewStep
            salon={salon}
            service={service}
            stylist={stylist}
            slot={slot}
            onBack={() => goTo("slot")}
            onSlotTaken={slotTaken}
          />
        ) : null}
      </div>
    </div>
  );
}
