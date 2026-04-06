import svgPaths from "./svg-qel37b9gj0";
import imgLocationMap from "./85cd3709b871fd60b68fb20cc0cbfab6420e355e.png";

function Background() {
  return (
    <div className="bg-[#ffdad6] content-stretch flex flex-col items-start px-[12px] py-[4px] relative shrink-0" data-name="Background">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#93000a] text-[12px] tracking-[1.2px] uppercase w-[162.44px]">
        <p className="leading-[16px]">Critical Asset Fault</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[122.42px]">
        <p className="leading-[16px]">CODE: HW-ERR-7042</p>
      </div>
    </div>
  );
}

function StatusHeaderIndustrialKit() {
  return (
    <div className="relative shrink-0 w-full" data-name="Status Header (Industrial Kit)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative w-full">
        <Background />
        <Container1 />
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="h-[27px] relative shrink-0 w-[32.85px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32.85 27">
        <g id="Container">
          <path d={svgPaths.p3e5f5e80} fill="var(--fill-0, #BA1A1A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#ffdad6] content-stretch flex items-center justify-center relative rounded-[4px] shrink-0 size-[64px]" data-name="Background">
      <Container4 />
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col h-[72px] items-start pb-[8px] relative shrink-0 w-[64px]" data-name="Margin">
      <Background1 />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[30px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[30px] text-center tracking-[-0.75px] w-[409.92px]">
        <p className="leading-[30px]">Technician Support Required</p>
      </div>
    </div>
  );
}

function Heading1Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0" data-name="Heading 1:margin">
      <Heading />
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-center px-[14.17px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[59px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[18px] text-center w-[465.66px]">
        <p className="leading-[29.25px] mb-0">{`This issue requires on-site technical assistance. We've`}</p>
        <p className="leading-[29.25px]">notified the local site responder.</p>
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0" data-name="Margin">
      <Container5 />
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <Margin />
      <Heading1Margin />
      <Margin1 />
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] tracking-[0.8px] uppercase w-full">
        <p className="leading-[24px]">Root Cause Analysis</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] w-full">
        <p className="leading-[24px] mb-0">A hardware fault was detected that cannot be resolved</p>
        <p className="leading-[24px]">safely by the user.</p>
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#efeded] col-1 justify-self-stretch relative row-1 self-start shrink-0" data-name="Background">
      <div className="content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Heading1 />
        <Container6 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 3">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] tracking-[0.8px] uppercase w-full">
        <p className="leading-[24px]">Instructions</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] w-full">
        <p className="leading-[24px] mb-0">Please leave the charger</p>
        <p className="leading-[24px] mb-0">as it is. A technician will</p>
        <p className="leading-[24px] mb-0">be dispatched to this</p>
        <p className="leading-[24px]">location.</p>
      </div>
    </div>
  );
}

function Background3() {
  return (
    <div className="bg-[#efeded] col-1 justify-self-stretch relative row-1 self-start shrink-0" data-name="Background">
      <div className="content-stretch flex flex-col gap-[8px] items-start p-[24px] relative w-full">
        <Heading2 />
        <Container8 />
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#93000a] text-[16px] tracking-[0.8px] uppercase w-full">
          <p className="leading-[24px]">Safety Protocol</p>
        </div>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#ba1a1a] text-[16px] w-full">
          <p className="leading-[24px] mb-0">Safety is our priority. Do</p>
          <p className="leading-[24px] mb-0">not attempt further</p>
          <p className="leading-[24px]">troubleshooting.</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder() {
  return (
    <div className="bg-[#efeded] col-2 justify-self-stretch relative row-1 self-start shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#ba1a1a] border-l-4 border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[8px] items-start pb-[48px] pl-[28px] pr-[24px] pt-[24px] relative w-full">
        <Heading3 />
        <Container9 />
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="col-1 gap-x-[4px] gap-y-[4px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[_176px] justify-self-stretch relative row-2 self-start shrink-0" data-name="Container">
      <Background3 />
      <BackgroundVerticalBorder />
    </div>
  );
}

function OrchestratedGridBentoStyleExplanation() {
  return (
    <div className="gap-x-[4px] gap-y-[4px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__128px_176px] pt-[16px] relative shrink-0 w-full" data-name="Orchestrated Grid/Bento Style Explanation">
      <Background2 />
      <Container7 />
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[12.25px] relative shrink-0 w-[10.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 12.25">
        <g id="Container">
          <path d={svgPaths.p13490000} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] w-[216.02px]">
        <p className="leading-[20px]">Estimated Response: 45 Minutes</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative">
        <Container11 />
        <Container12 />
      </div>
    </div>
  );
}

function LocationMap() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-full" data-name="Location Map">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[258.95%] left-0 max-w-none top-[-79.47%] w-full" src={imgLocationMap} />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="h-[192px] opacity-80 relative shrink-0 w-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute bg-clip-padding bg-white border-0 border-[transparent] border-solid inset-0 mix-blend-saturation pointer-events-none" />
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.1)] border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center p-px relative size-full">
        <LocationMap />
        <div className="absolute bg-[rgba(186,26,26,0.1)] inset-px" data-name="Overlay" />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#e4e2e2] relative shrink-0 w-full" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center py-[16px] relative w-full">
        <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[14px] text-center tracking-[-0.35px] uppercase w-[200.33px]">
          <p className="leading-[20px]">Return to Asset Overview</p>
        </div>
      </div>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center pt-[25px] relative shrink-0 w-full" data-name="HorizontalBorder">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.2)] border-solid border-t inset-0 pointer-events-none" />
      <Container10 />
      <BackgroundBorder />
      <Button />
    </div>
  );
}

function Container2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-start relative w-full">
        <Container3 />
        <OrchestratedGridBentoStyleExplanation />
        <HorizontalBorder />
      </div>
    </div>
  );
}

function EscalationCard() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Escalation Card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[32px] items-start p-[41px] relative w-full">
          <StatusHeaderIndustrialKit />
          <Container2 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[158.44px]">
        <p className="leading-[16px]">TICKET ID: #RX-29381-S</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <div className="bg-[#ba1a1a] rounded-[12px] shrink-0 size-[8px]" data-name="Background" />
      <Container14 />
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] text-center w-[130.5px]">
        <p className="[text-decoration-skip-ink:none] decoration-solid leading-[16px] underline">View Safety Guidelines</p>
      </div>
    </div>
  );
}

function ContextualSupportInfo() {
  return (
    <div className="relative shrink-0 w-full" data-name="Contextual Support Info">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[16px] relative w-full">
          <Container13 />
          <Button1 />
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start max-w-[576px] relative shrink-0 w-[576px]" data-name="Container">
      <EscalationCard />
      <ContextualSupportInfo />
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="absolute bg-[#f5f3f3] content-stretch flex items-center justify-center left-0 p-[24px] right-0 top-[75px]" data-name="Main Content Canvas">
      <Container />
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[78.74px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[48px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[480.17px]">
        <p className="leading-[24px] mb-0">© 2024 RExharge Infrastructure. Engineered for</p>
        <p className="leading-[24px]">Reliability.</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[18px] w-[83.84px]">
        <p className="leading-[28px]">RExharge</p>
      </div>
      <Container17 />
    </div>
  );
}

function Link() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[56px] content-stretch flex flex-col items-start left-[calc(50%-185.49px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[141.84px]">
        <p className="leading-[24px]">Privacy Policy</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[56px] content-stretch flex flex-col items-start left-[calc(50%-0.07px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[165px]">
        <p className="leading-[24px]">Terms of Service</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[56px] content-stretch flex flex-col items-start left-[calc(50%+185.41px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[141.95px]">
        <p className="leading-[24px]">System Status</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="-translate-x-1/2 absolute bottom-0 content-stretch flex flex-col items-start left-[calc(50%-0.02px)] top-[56px]" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[169.42px]">
        <p className="leading-[24px]">Contact Support</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="h-[80px] relative shrink-0 w-[673.09px]" data-name="Container">
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container15() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[48px] relative w-full">
          <Container16 />
          <Container18 />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col items-start left-0 pt-px right-0 top-[1179px]" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-solid border-t inset-0 pointer-events-none" />
      <Container15 />
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
    <div className="content-stretch flex flex-col items-start px-[12px] py-[8px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[102.77px]">
        <p className="leading-[24px]">Infrastructure</p>
      </div>
    </div>
  );
}

function LinkMargin() {
  return (
    <div className="content-stretch flex flex-col items-start pl-[44px] pr-[12px] py-[8px] relative shrink-0" data-name="Link:margin">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[37.22px]">
        <p className="leading-[24px]">Fleet</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[10px] pt-[8px] px-[12px] relative shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#15803d] border-b-2 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#15803d] text-[16px] w-[62.22px]">
        <p className="leading-[24px]">Support</p>
      </div>
    </div>
  );
}

function LinkMargin1() {
  return (
    <div className="content-stretch flex flex-col items-start pl-[32px] relative shrink-0" data-name="Link:margin">
      <Link5 />
    </div>
  );
}

function Nav() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Nav">
      <Link4 />
      <LinkMargin />
      <LinkMargin1 />
    </div>
  );
}

function Button2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] text-center w-[48.58px]">
        <p className="leading-[24px]">Safety</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#006e28] content-stretch flex flex-col items-center justify-center px-[24px] py-[8px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white w-[66.69px]">
        <p className="leading-[24px]">Get Help</p>
      </div>
    </div>
  );
}

function ButtonMargin() {
  return (
    <div className="content-stretch flex flex-col items-start pl-[16px] relative shrink-0" data-name="Button:margin">
      <Button3 />
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Button2 />
      <ButtonMargin />
    </div>
  );
}

function Container19() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] pl-[24px] pr-[24.01px] py-[16px] relative w-full">
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

export default function Component7Escalation() {
  return (
    <div className="bg-[#fbf9f8] relative size-full" data-name="7. Escalation">
      <MainContentCanvas />
      <Footer />
      <HeaderTopAppBar />
    </div>
  );
}