"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import svgPaths from "../../imports/4AdaptiveQuestions/svg-9543ytu969";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { fetchTriage } from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";

type FollowUpQuestion = { question_id: string; prompt: string };

export default function AdaptiveQuestions() {
  const router = useRouter();
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
  const progress = totalQuestions > 0 ? Math.round(((currentIndex + 1) / (totalQuestions + 2)) * 100) : 50;

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
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
    const mergedAnswers = {
      ...(session.followUpAnswers ?? {}),
      ...answers,
    };

    try {
      writeSession({ followUpAnswers: mergedAnswers });

      const triage = await fetchTriage({
        incident_id: session.incidentId,
        site_id: session.siteId ?? "site-mall-01",
        charger_id: session.chargerId,
        photo_evidence: session.photoEvidence,
        photo_hint: session.photoHint ?? "",
        symptom_text: session.symptomText ?? "",
        error_code: session.errorCode ?? "",
        follow_up_answers: mergedAnswers,
        demo_scenario_id: session.demoScenarioId,
      });

      writeSession({
        incidentId: triage.incident_id,
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
  const session = readSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-lg border-slate-200 mb-8 relative z-10">
        <div className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col gap-5">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-xs font-bold text-green-700">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className="text-green-700 w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 33 33">
              <path d={svgPaths.p6e9d280} fill="currentColor" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight leading-snug mb-4">
            {currentQuestion.prompt}
          </CardTitle>
          <CardDescription className="text-lg max-w-lg mx-auto mb-10">
            Please describe what you can observe to help us make a more accurate assessment.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-14">
          <textarea
            id={currentQuestion.question_id}
            value={currentAnswer}
            onChange={(event) => setAnswer(currentQuestion.question_id, event.target.value)}
            rows={4}
            placeholder="Enter your answer here..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all resize-none text-base"
          />

          {errorMsg ? (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              {errorMsg}
            </div>
          ) : null}

          <div className="mt-6 flex gap-4">
            {isLastQuestion ? (
              <button
                id="questions-submit-btn"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all shadow-md"
              >
                {isSubmitting ? "Running triage..." : "Submit and See Results"}
              </button>
            ) : (
              <button
                id="questions-next-btn"
                onClick={handleNext}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all shadow-md"
              >
                Next Question &gt;
              </button>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-200 p-6 px-10 flex justify-between items-center w-full">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-slate-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 9.33333">
              <path d={svgPaths.p306f9a98} fill="currentColor" />
            </svg>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-medium hidden sm:inline">
              Need direct assistance?
            </span>
            <Button variant="link" className="px-0 font-bold">
              Contact Engineer
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="bg-slate-200/50 border border-slate-200/60 rounded-xl py-3 px-6 flex flex-wrap justify-center gap-6 items-center w-fit mx-auto shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 text-slate-700">
          <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 10.5 10.5">
            <path d={svgPaths.p215f9a00} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">
            {session.chargerId ? `Unit: ${session.chargerId}` : "Unit: Live Triage"}
          </span>
        </div>
        <div className="w-px h-5 bg-slate-300"></div>
        <div className="flex items-center gap-3 text-slate-700">
          <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 10.5 11.0833">
            <path d={svgPaths.p20854500} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">
            INC-{session.incidentId ?? "Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}
