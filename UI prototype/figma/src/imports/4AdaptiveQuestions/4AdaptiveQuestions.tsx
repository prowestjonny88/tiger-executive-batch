import svgPaths from "./svg-9543ytu969";

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[1.2px] uppercase w-[175.8px]">
        <p className="leading-[16px]">Diagnostic Step 2 of 4</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#006e28] text-[12px] w-[86.23px]">
        <p className="leading-[16px]">50% Complete</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container2 />
      <Container3 />
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#e9e8e7] h-[6px] overflow-clip relative rounded-[12px] shrink-0 w-full" data-name="Background">
      <div className="absolute bg-[#006e28] bottom-0 left-0 right-1/2 top-0" data-name="Background" />
    </div>
  );
}

function ProgressHeader() {
  return (
    <div className="bg-[#f5f3f3] relative shrink-0 w-full" data-name="Progress Header">
      <div className="content-stretch flex flex-col gap-[16px] items-start pb-[24px] pt-[32px] px-[32px] relative w-full">
        <Container1 />
        <Background />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0 size-[33px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 33">
        <g id="Container">
          <path d={svgPaths.p6e9d280} fill="var(--fill-0, #006E28)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center pt-[4px] relative shrink-0 w-full" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[30px] text-center tracking-[-0.75px] w-[508.55px]">
        <p className="leading-[36px]">Is the charging LED solid or blinking?</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] text-center w-[547.81px]">
        <p className="leading-[24px]">Check the indicator light located near the charging port on the main unit.</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
      <Container5 />
      <Heading />
      <Container6 />
    </div>
  );
}

function BackgroundShadow() {
  return (
    <div className="bg-[#7bfd8d] content-stretch flex items-center justify-center relative rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px]" data-name="Background+Shadow">
      <div className="bg-[#006e28] rounded-[12px] shrink-0 size-[16px]" data-name="Background" />
    </div>
  );
}

function Margin() {
  return (
    <div className="h-[64px] relative shrink-0 w-[48px]" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[16px] relative size-full">
        <BackgroundShadow />
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[18px] text-center w-[100.39px]">
          <p className="leading-[28px]">Solid Green</p>
        </div>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[111.84px]">
        <p className="leading-[20px]">Normal idle state</p>
      </div>
    </div>
  );
}

function Margin1() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[4px] relative">
        <Container8 />
      </div>
    </div>
  );
}

function ButtonOption() {
  return (
    <div className="bg-[#f5f3f3] col-1 content-stretch flex flex-col items-center justify-center justify-self-start px-[84.08px] py-[26px] relative rounded-[4px] row-1 self-start shrink-0" data-name="Button - Option 1">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Margin />
      <Container7 />
      <Margin1 />
    </div>
  );
}

function BackgroundShadow1() {
  return (
    <div className="bg-[#ffdad6] content-stretch flex items-center justify-center relative rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px]" data-name="Background+Shadow">
      <div className="bg-[#ba1a1a] rounded-[12px] shrink-0 size-[16px]" data-name="Background" />
    </div>
  );
}

function Margin2() {
  return (
    <div className="h-[64px] relative shrink-0 w-[48px]" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[16px] relative size-full">
        <BackgroundShadow1 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[18px] text-center w-[107.45px]">
          <p className="leading-[28px]">Blinking Red</p>
        </div>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[160.08px]">
        <p className="leading-[20px]">Hardware fault detected</p>
      </div>
    </div>
  );
}

function Margin3() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[4px] relative">
        <Container10 />
      </div>
    </div>
  );
}

function ButtonOption1() {
  return (
    <div className="bg-[#f5f3f3] col-2 content-stretch flex flex-col items-center justify-center justify-self-start pl-[59.95px] pr-[59.97px] py-[26px] relative rounded-[4px] row-1 self-start shrink-0" data-name="Button - Option 2">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Margin2 />
      <Container9 />
      <Margin3 />
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[20.625px] relative shrink-0 w-[19.8px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.8 20.625">
        <g id="Container">
          <path d={svgPaths.p3c54ec00} fill="var(--fill-0, #6D7B6B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundShadow2() {
  return (
    <div className="bg-[#e4e2e2] content-stretch flex items-center justify-center relative rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px]" data-name="Background+Shadow">
      <Container11 />
    </div>
  );
}

function Margin4() {
  return (
    <div className="h-[64px] relative shrink-0 w-[48px]" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[16px] relative size-full">
        <BackgroundShadow2 />
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[18px] text-center w-[72.69px]">
          <p className="leading-[28px]">No Light</p>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[139.41px]">
        <p className="leading-[20px]">Power issue possible</p>
      </div>
    </div>
  );
}

function Margin5() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[4px] relative">
        <Container13 />
      </div>
    </div>
  );
}

function ButtonOption2() {
  return (
    <div className="bg-[#f5f3f3] col-1 content-stretch flex flex-col items-center justify-center justify-self-start pl-[70.3px] pr-[70.29px] py-[26px] relative rounded-[4px] row-2 self-start shrink-0" data-name="Button - Option 3">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Margin4 />
      <Container12 />
      <Margin5 />
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p2ef76100} fill="var(--fill-0, #5D5C74)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function BackgroundShadow3() {
  return (
    <div className="bg-[#e2e0fc] content-stretch flex items-center justify-center relative rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[48px]" data-name="Background+Shadow">
      <Container14 />
    </div>
  );
}

function Margin6() {
  return (
    <div className="h-[64px] relative shrink-0 w-[48px]" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[16px] relative size-full">
        <BackgroundShadow3 />
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[18px] text-center w-[100.61px]">
          <p className="leading-[28px]">Other Color</p>
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[151.97px]">
        <p className="leading-[20px]">Amber, blue, or cycling</p>
      </div>
    </div>
  );
}

function Margin7() {
  return (
    <div className="relative shrink-0" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[4px] relative">
        <Container16 />
      </div>
    </div>
  );
}

function ButtonOption3() {
  return (
    <div className="bg-[#f5f3f3] col-2 content-stretch flex flex-col items-center justify-center justify-self-start pl-[64.02px] pr-[64.01px] py-[26px] relative rounded-[4px] row-2 self-start shrink-0" data-name="Button - Option 4">
      <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <Margin6 />
      <Container15 />
      <Margin7 />
    </div>
  );
}

function OptionsGrid() {
  return (
    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[__168px_168px] relative shrink-0 w-full" data-name="Options Grid">
      <ButtonOption />
      <ButtonOption1 />
      <ButtonOption2 />
      <ButtonOption3 />
    </div>
  );
}

function QuestionSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Question Section">
      <div className="content-stretch flex flex-col gap-[32px] items-start p-[48px] relative w-full">
        <Container4 />
        <OptionsGrid />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 size-[9.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p306f9a98} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Button">
      <Container17 />
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] text-center w-[37.78px]">
        <p className="leading-[24px]">Back</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[12px] text-[rgba(62,74,60,0.6)] tracking-[1.2px] uppercase w-[190.52px]">
        <p className="leading-[16px]">Need direct assistance?</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#006e28] text-[14px] w-[117.23px]">
        <p className="leading-[20px]">Contact Engineer</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container19 />
      <Link />
    </div>
  );
}

function FooterNavigation() {
  return (
    <div className="bg-[#f5f3f3] relative shrink-0 w-full" data-name="Footer Navigation">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[32px] py-[24px] relative w-full">
          <Button />
          <Container18 />
        </div>
      </div>
    </div>
  );
}

function DiagnosticFlowCard() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="Diagnostic Flow Card">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
        <ProgressHeader />
        <QuestionSection />
        <FooterNavigation />
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-[-1px] pointer-events-none rounded-[9px] shadow-[0px_16px_32px_0px_rgba(27,28,28,0.06)]" />
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 size-[10.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 10.5">
        <g id="Container">
          <path d={svgPaths.p215f9a00} fill="var(--fill-0, #006E28)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[0.6px] uppercase w-[125.06px]">
        <p className="leading-[16px]">Unit ID: RX-990-22</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex gap-[7.99px] items-center relative shrink-0" data-name="Container">
      <Container21 />
      <Container22 />
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[11.083px] relative shrink-0 w-[10.5px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 11.0833">
        <g id="Container">
          <path d={svgPaths.p20854500} fill="var(--fill-0, #006E28)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[0.6px] uppercase w-[109.31px]">
        <p className="leading-[16px]">Firmware v2.4.1</p>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex gap-[7.99px] items-center relative shrink-0" data-name="Container">
      <Container24 />
      <Container25 />
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(233,232,231,0.5)] relative rounded-[12px] self-stretch shrink-0" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-[-1px] pointer-events-none rounded-[13px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] h-full items-center px-[24px] py-[12px] relative">
          <Container20 />
          <div className="bg-[rgba(189,202,185,0.3)] h-[16px] shrink-0 w-px" data-name="Vertical Divider" />
          <Container23 />
        </div>
      </div>
    </div>
  );
}

function ContextualHelpSubtle() {
  return (
    <div className="content-stretch flex h-[40px] items-start justify-center relative shrink-0 w-full" data-name="Contextual Help (Subtle)">
      <OverlayBorder />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start max-w-[672px] relative shrink-0 w-[672px]" data-name="Container">
      <DiagnosticFlowCard />
      <ContextualHelpSubtle />
    </div>
  );
}

function MainContentArea() {
  return (
    <div className="absolute bg-[#fbf9f8] content-stretch flex items-center justify-center left-0 p-[24px] right-0 top-[69px]" data-name="Main Content Area">
      <Container />
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[64.22px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[48px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[480.17px]">
        <p className="leading-[24px] mb-0">© 2024 RExharge Infrastructure. Engineered for</p>
        <p className="leading-[24px]">Reliability.</p>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[18px] w-[83.84px]">
        <p className="leading-[28px]">RExharge</p>
      </div>
      <Container28 />
    </div>
  );
}

function Link1() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[40px] content-stretch flex flex-col items-start left-[calc(50%-185.47px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[141.84px]">
        <p className="leading-[24px]">Privacy Policy</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[40px] content-stretch flex flex-col items-start left-[calc(50%-0.05px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[165px]">
        <p className="leading-[24px]">Terms of Service</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="-translate-x-1/2 absolute bottom-[40px] content-stretch flex flex-col items-start left-[calc(50%+185.42px)] top-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[141.95px]">
        <p className="leading-[24px]">System Status</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="-translate-x-1/2 absolute bottom-0 content-stretch flex flex-col items-start left-1/2 top-[40px]" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] tracking-[0.8px] uppercase w-[169.42px]">
        <p className="leading-[24px]">Contact Support</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="h-[64px] relative shrink-0 w-[655.61px]" data-name="Container">
      <Link1 />
      <Link2 />
      <Link3 />
      <Link4 />
    </div>
  );
}

function Container26() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[48px] relative w-full">
          <Container27 />
          <Container29 />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col items-start left-0 pt-px right-0 top-[967px]" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[#e2e8f0] border-solid border-t inset-0 pointer-events-none" />
      <Container26 />
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[24px] tracking-[-0.6px] w-[106.98px]">
        <p className="leading-[32px]">RExharge</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start px-[12px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[82.53px]">
        <p className="leading-[24px]">Dashboard</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="content-stretch flex flex-col items-start px-[12px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[69.5px]">
        <p className="leading-[24px]">Chargers</p>
      </div>
    </div>
  );
}

function Link7() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[6px] pt-[4px] px-[12px] relative shrink-0" data-name="Link">
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
      <Link5 />
      <Link6 />
      <Link7 />
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] text-center w-[48.58px]">
        <p className="leading-[24px]">Safety</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative rounded-[4px] shrink-0" data-name="Button" style={{ backgroundImage: "linear-gradient(135deg, rgb(0, 110, 40) 0%, rgb(39, 178, 77) 100%)" }}>
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-white w-[96.22px]">
        <p className="leading-[20px]">System Status</p>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Container">
      <Button1 />
      <Button2 />
    </div>
  );
}

function Container30() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[16px] relative w-full">
          <Container31 />
          <Nav />
          <Container32 />
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-start left-0 pb-px right-0 top-0" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#f8fafc] border-b border-solid inset-0 pointer-events-none" />
      <Container30 />
    </div>
  );
}

export default function Component4AdaptiveQuestions() {
  return (
    <div className="bg-[#fbf9f8] relative size-full" data-name="4. Adaptive Questions">
      <MainContentArea />
      <Footer />
      <HeaderTopAppBar />
    </div>
  );
}