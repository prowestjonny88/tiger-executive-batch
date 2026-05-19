import { useState } from "react";
import { UploadDropzone } from "./upload-dropzone";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

interface FollowUpControlProps {
  questionId: string;
  value: string;
  onChange: (val: string) => void;
  onFileSelect?: (file: File) => void;
  fileName?: string;
}

export function FollowUpControl({ questionId, value, onChange, onFileSelect, fileName }: FollowUpControlProps) {
  const isPhotoUpload = [
    "evdb_label_closeup",
    "charger_identity_closeup",
    "photo_request",
    "clear_theme2_photo",
    "charger_app_screenshot",
  ].includes(questionId);

  const isIsolator = questionId === "isolator_switch_state";
  const isRedLightCount = questionId === "red_light_flash_count";

  if (isPhotoUpload || isIsolator) {
    return (
      <div className="space-y-6">
        <UploadDropzone
          onFileSelect={(file) => {
            if (onFileSelect) onFileSelect(file);
          }}
          fileName={fileName}
          title={
            questionId === "evdb_label_closeup"
              ? "Upload EVDB label close-up"
              : questionId === "charger_identity_closeup"
                ? "Upload charger label close-up"
                : questionId === "charger_app_screenshot"
                  ? "Upload EV app screenshot"
                  : questionId === "isolator_switch_state"
                    ? "Upload isolator switch photo"
                    : "Upload clearer proof photo"
          }
          subtitle="Use clear lighting and keep all labels readable."
        />
        {isIsolator && (
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Switch State (Optional)</Label>
            <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on" id="on" />
                <Label htmlFor="on">ON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off" id="off" />
                <Label htmlFor="off">OFF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unsure" id="unsure" />
                <Label htmlFor="unsure">Not sure</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    );
  }

  if (isRedLightCount) {
    return (
      <div className="space-y-3">
        <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {[
            ["6", "Ground fault / installation review"],
            ["7", "Emergency stop / manual error"],
            ["8", "Short circuit / after-sales"],
            ["9", "Over-temperature / restart"],
            ["Not sure", "Upload app screenshot if available"],
          ].map(([option, helper]) => (
            <Label
              key={option}
              htmlFor={option}
              className={`flex min-h-[108px] flex-col justify-center p-4 border rounded-xl cursor-pointer transition-colors ${
                value === option ? "border-green-600 bg-green-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <RadioGroupItem value={option} id={option} className="sr-only" />
              <span className="font-bold text-lg">{option}</span>
              <span className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Enter your answer here..."
      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-800 font-medium focus:ring-2 focus:ring-green-500 focus:bg-white transition-all resize-none text-base"
    />
  );
}
