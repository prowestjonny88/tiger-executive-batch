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
        <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {["6", "7", "8", "9", "Not sure"].map((option) => (
            <Label
              key={option}
              htmlFor={option}
              className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${
                value === option ? "border-green-600 bg-green-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <RadioGroupItem value={option} id={option} className="sr-only" />
              <span className="font-bold text-lg">{option}</span>
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
