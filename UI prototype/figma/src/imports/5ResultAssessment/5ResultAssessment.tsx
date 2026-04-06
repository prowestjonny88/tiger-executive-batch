import svgPaths from "./svg-li50nl9dl4";

function Container1() {
  return (
    <div className="h-[24px] relative shrink-0 w-[27px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27 24">
        <g id="Container">
          <path d={svgPaths.p3b120c80} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#9c9b9b] content-stretch flex items-center justify-center relative rounded-[4px] shrink-0 size-[64px]" data-name="Background">
      <Container1 />
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col h-[88px] items-start pb-[24px] relative shrink-0 w-[64px]" data-name="Margin">
      <Background />
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[12.25px] relative shrink-0 w-[12.833px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 12.25">
        <g id="Container">
          <path d={svgPaths.p3b404880} fill="var(--fill-0, #003C12)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#003c12] text-[12px] text-center tracking-[0.6px] uppercase w-[238.2px]">
        <p className="leading-[16px]">Analysis Confidence: High (94%)</p>
      </div>
    </div>
  );
}

function Overlay() {
  return (
    <div className="bg-[rgba(39,178,77,0.1)] content-stretch flex gap-[8px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="Overlay">
      <Container2 />
      <Container3 />
    </div>
  );
}

function Margin1() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] relative shrink-0" data-name="Margin">
      <Overlay />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center pl-[60.02px] pr-[60.03px] relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[80px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[36px] text-center tracking-[-0.9px] w-[453.95px]">
        <p className="leading-[40px] mb-0">Potential Connection Issue</p>
        <p className="leading-[40px]">Detected</p>
      </div>
    </div>
  );
}

function Heading1Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[16px] relative shrink-0" data-name="Heading 1:margin">
      <Heading />
    </div>
  );
}

function StatusIconBadgeSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Status Icon & Badge Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <Margin />
        <Margin1 />
        <Heading1Margin />
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[88px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[18px] text-center w-[513.68px]">
        <p className="leading-[29.25px] mb-0">Based on the photo and your answers, there appears to be a</p>
        <p className="leading-[29.25px] mb-0">minor synchronization error between the charger and the</p>
        <p className="leading-[29.25px]">vehicle.</p>
      </div>
    </div>
  );
}

function ExplanationPanelTonalShift() {
  return (
    <div className="bg-[#f5f3f3] relative shrink-0 w-full" data-name="Explanation Panel (Tonal Shift)">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border border-[transparent] border-solid content-stretch flex flex-col items-start p-[24px] relative w-full">
        <Container4 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[1.2px] uppercase w-full">
          <p className="leading-[16px]">Detected Asset</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder() {
  return (
    <div className="bg-[#efeded] col-1 justify-self-stretch relative row-1 self-start shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#9c9b9b] border-l-4 border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[4px] items-start pl-[20px] pr-[16px] py-[16px] relative w-full">
        <Container5 />
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] w-[133.11px]">
          <p className="leading-[24px]">RX-Charger 09-A</p>
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[1.2px] uppercase w-full">
          <p className="leading-[16px]">Status</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder1() {
  return (
    <div className="bg-[#efeded] col-2 justify-self-stretch relative row-1 self-start shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#006e28] border-l-4 border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[4px] items-start pl-[20px] pr-[16px] py-[16px] relative w-full">
        <Container6 />
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] w-[218.34px]">
          <p className="leading-[24px]">Maintenance Recommended</p>
        </div>
      </div>
    </div>
  );
}

function DetailGridAsymmetricLayout() {
  return (
    <div className="relative shrink-0 w-full" data-name="Detail Grid (Asymmetric Layout)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[_76px] relative w-full">
        <BackgroundVerticalBorder />
        <BackgroundVerticalBorder1 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-gradient-to-r content-stretch flex flex-col from-[#006e28] items-center justify-center min-w-[240px] pl-[47.81px] pr-[47.83px] py-[16px] relative shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 to-[#27b24d]" data-name="Button">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[18px] text-center text-white w-[144.36px]">
        <p className="leading-[28px]">View Next Steps</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0 size-[9.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p2db3a360} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Button">
      <Container7 />
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[137.52px]">
        <p className="leading-[20px]">Run Diagnosis Again</p>
      </div>
    </div>
  );
}

function ActionSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Action Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[15.5px] items-center relative w-full">
        <Button />
        <Button1 />
      </div>
    </div>
  );
}

function AssessmentResultCard() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Assessment Result Card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[32px] items-start p-[49px] relative w-full">
          <StatusIconBadgeSection />
          <ExplanationPanelTonalShift />
          <DetailGridAsymmetricLayout />
          <ActionSection />
          <div className="absolute bg-[#9c9b9b] h-[4px] left-px opacity-30 right-px top-px" data-name="Tonal accent at the top" />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.1)] border-solid inset-0 pointer-events-none shadow-[0px_16px_32px_0px_rgba(27,28,28,0.06)]" />
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="Container">
          <path d={svgPaths.p15221b80} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[91.78px]">
        <p className="leading-[16px]">Analyzed in 1.4s</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container9 />
      <Container10 />
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[12px] relative shrink-0 w-[16.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.5 12">
        <g id="Container">
          <path d={svgPaths.p32b04540} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[125.59px]">
        <p className="leading-[16px]">Data Logged Securely</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container12 />
      <Container13 />
    </div>
  );
}

function ContextHint() {
  return (
    <div className="content-stretch flex gap-[24px] items-center justify-center relative shrink-0 w-full" data-name="Context Hint">
      <Container8 />
      <div className="bg-[#bdcab9] h-[16px] opacity-30 shrink-0 w-px" data-name="Vertical Divider" />
      <Container11 />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start max-w-[672px] relative shrink-0 w-[672px]" data-name="Container">
      <AssessmentResultCard />
      <ContextHint />
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="absolute bg-[#fbf9f8] content-stretch flex items-center justify-center left-0 p-[24px] right-0 top-[73px]" data-name="Main Content Canvas">
      <Container />
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[18px] w-[83.84px]">
        <p className="leading-[28px]">RExharge</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[444.78px]">
        <p className="leading-[16px]">© 2024 RExharge Infrastructure. Engineered for Reliability.</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-[444.78px]" data-name="Container">
      <Container16 />
      <Container17 />
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[106.39px]">
        <p className="leading-[16px]">Privacy Policy</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[123.75px]">
        <p className="leading-[16px]">Terms of Service</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[106.47px]">
        <p className="leading-[16px]">System Status</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[127.08px]">
        <p className="leading-[16px]">Contact Support</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex gap-[32px] h-[16px] items-start justify-center relative shrink-0" data-name="Container">
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container14() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[48px] relative w-full">
          <Container15 />
          <Container18 />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col items-start left-0 pt-px right-0 top-[911px]" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-solid border-t inset-0 pointer-events-none" />
      <Container14 />
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[24px] tracking-[-0.6px] w-[106.98px]">
        <p className="leading-[32px]">RExharge</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="content-stretch flex flex-col items-start px-[8px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[82.53px]">
        <p className="leading-[24px]">Dashboard</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start px-[8px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[64.31px]">
        <p className="leading-[24px]">Network</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[6px] pt-[4px] px-[8px] relative shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#15803d] border-b-2 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#15803d] text-[16px] w-[66.69px]">
        <p className="leading-[24px]">Get Help</p>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="Nav">
      <Link4 />
      <Link5 />
      <Link6 />
    </div>
  );
}

function Button2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] text-center w-[48.58px]">
        <p className="leading-[24px]">Safety</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#006e28] content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative rounded-[4px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white w-[66.31px]">
        <p className="leading-[24px]">Get Help</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Container">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Container19() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[16px] relative w-full">
          <Container20 />
          <Nav />
          <Container21 />
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-start left-0 pb-px right-0 top-0" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-b border-solid inset-0 pointer-events-none" />
      <Container19 />
    </div>
  );
}

export default function Component5ResultAssessment() {
  return (
    <div className="bg-[#fbf9f8] relative size-full" data-name="5. Result / Assessment">
      <MainContentCanvas />
      <Footer />
      <HeaderTopAppBar />
    </div>
  );
}