"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import svgPaths from "../../imports/4AdaptiveQuestions/svg-9543ytu969";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { fetchTriage, uploadIncidentPhoto } from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { FollowUpControl } from "../../components/triage/follow-up-control";
import { CaseContextBar } from "../../components/triage/case-context-bar";
import { getFollowUpDisplayCopy } from "../../lib/follow-up-copy";

type FollowUpQuestion = { question_id: string; prompt: string };

function isUploadStyleFollowUp(questionId: string) {
  return [
    "evdb_label_closeup",
    "charger_identity_closeup",
    "photo_request",
    "clear_theme2_photo",
    "charger_app_screenshot",
  ].includes(questionId);
}

export default function AdaptiveQuestions() {
  const router = useRouter();
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session.preview?.follow_up_questions?.length) {
      router.replace("/result");
      return;
    }

    setQuestions(session.preview.follow_up_questions);
    setAnswers(session.followUpAnswers ?? {});
    setLoaded(true);
  }, [router]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 50;

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  };

  const setFile = (questionId: string, file: File) => {
    setFiles((previous) => ({ ...previous, [questionId]: file }));
    setAnswer(questionId, `[Uploaded Photo: ${file.name}]`);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((index) => index + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    const session = readSession();
    
    // Upload any newly selected files for follow-up questions
    const finalAnswers = { ...answers };
    let appScreenshotEvidence = session.appScreenshotEvidence;
    for (const [qId, file] of Object.entries(files)) {
      try {
        const uploaded = await uploadIncidentPhoto(file);
        finalAnswers[qId] = `[Uploaded Photo ID: ${uploaded.storage_path}]`;
        if (qId === "charger_app_screenshot" || qId === "red_light_flash_count") {
          appScreenshotEvidence = uploaded;
          finalAnswers[qId] = `[Uploaded app screenshot: ${uploaded.filename}]`;
        }
      } catch (e) {
        // Fallback if upload fails
        finalAnswers[qId] = `[Failed to upload: ${file.name}]`;
      }
    }

    const mergedAnswers = {
      ...(session.followUpAnswers ?? {}),
      ...finalAnswers,
    };

    try {
      writeSession({ followUpAnswers: mergedAnswers });

      const triage = await fetchTriage({
        incident_id: session.incidentId,
        site_id: session.siteId ?? "site-mall-01",
        charger_id: session.chargerId,
        photo_evidence: session.photoEvidence,
        app_screenshot_evidence: appScreenshotEvidence,
        photo_hint: session.photoHint ?? "",
        symptom_text: session.symptomText ?? "",
        error_code: session.errorCode ?? "",
        follow_up_answers: mergedAnswers,
        demo_scenario_id: session.demoScenarioId,
      });

      writeSession({
        incidentId: triage.incident_id,
        appScreenshotEvidence,
        followUpAnswers: mergedAnswers,
        triage,
      });
      router.push("/result");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Triage request failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading questions...</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = answers[currentQuestion.question_id] ?? "";
  const currentFile = files[currentQuestion.question_id];
  const session = readSession();
  
  const { title, helper } = getFollowUpDisplayCopy(currentQuestion.question_id, currentQuestion.prompt);

  return (
    <PageShell maxWidth="3xl">
      <CaseContextBar
        incidentId={session.incidentId}
        component={session.preview?.quality?.filename ? "unknown" : "unknown"}
        status="Evidence clarification"
        className="mx-auto mb-5 w-fit"
      />
      <Card className="w-full overflow-hidden shadow-sm border-slate-200 mb-8 rounded-2xl bg-white">
        <div className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col gap-4">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Step {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm font-bold text-green-700">Evidence clarification</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-200 [&>div]:bg-green-600" />
        </div>

        <CardHeader className="p-8 md:p-12 pb-0 flex flex-col items-center text-center">
          <div className="text-green-700 w-12 h-12 flex items-center justify-center mb-4 bg-green-50 rounded-xl">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 33 33">
              <path d={svgPaths.p6e9d280} fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug mb-3">
            {title}
          </h2>
          <p className="text-base text-slate-600 max-w-lg mx-auto mb-8">
            {helper}
          </p>
        </CardHeader>

        <CardContent className="px-8 md:px-12 pb-12">
          <FollowUpControl
            questionId={currentQuestion.question_id}
            value={currentAnswer}
            onChange={(val) => setAnswer(currentQuestion.question_id, val)}
            onFileSelect={(file) => setFile(currentQuestion.question_id, file)}
            fileName={currentFile?.name}
          />

          {isUploadStyleFollowUp(currentQuestion.question_id) && (
            <Alert variant="warning" className="mt-4 rounded-xl">
              <AlertTitle>Safe photo reminder</AlertTitle>
              <AlertDescription>
                Take follow-up photos from a safe distance. Do not open electrical panels unless you are authorized.
              </AlertDescription>
            </Alert>
          )}

          {errorMsg && (
            <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            {isLastQuestion ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl shadow-sm"
              >
                {isSubmitting ? "Checking evidence..." : "Submit proof and view result"}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNext}
                className="w-full h-14 text-lg font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl shadow-sm"
              >
                Next Question
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center w-full">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-slate-700 hover:bg-slate-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 9.33333 9.33333">
              <path d={svgPaths.p306f9a98} fill="currentColor" />
            </svg>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-medium hidden sm:inline">
              Need direct assistance?
            </span>
            <Button variant="link" className="px-0 font-bold text-green-700">
              Contact Engineer
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="bg-white border border-slate-200 rounded-full py-2.5 px-6 flex flex-wrap justify-center gap-4 items-center w-fit mx-auto shadow-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 10.5 10.5">
            <path d={svgPaths.p215f9a00} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {session.chargerId ? `Unit: ${session.chargerId}` : "Unit: Live Triage"}
          </span>
        </div>
        <div className="w-px h-4 bg-slate-200"></div>
        <div className="flex items-center gap-2 text-slate-700">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 10.5 11.0833">
            <path d={svgPaths.p20854500} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            INC-{session.incidentId ?? "Pending"}
          </span>
        </div>
      </div>
    </PageShell>
  );
}
