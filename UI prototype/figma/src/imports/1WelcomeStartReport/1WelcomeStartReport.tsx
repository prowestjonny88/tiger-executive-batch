import svgPaths from "./svg-tqovfvsl6c";

function Container() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[24px] tracking-[-0.6px] w-[106.98px]">
        <p className="leading-[32px]">RExharge</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[64.31px]">
        <p className="leading-[24px]">Network</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[37.22px]">
        <p className="leading-[24px]">Fleet</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[2px] relative shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#15803d] border-b-2 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#15803d] text-[16px] w-[50.3px]">
        <p className="leading-[24px]">Safety</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="Container">
      <Link />
      <Link1 />
      <Link2 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[14px] text-center w-[58.03px]">
        <p className="leading-[20px]">Get Help</p>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Nav">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[16px] relative w-full">
          <Container />
          <Container1 />
          <Button />
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start pb-px relative shrink-0 w-full" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.15)] border-b border-solid inset-0 pointer-events-none" />
      <Nav />
    </div>
  );
}

function Container4() {
  return (
    <div className="h-[28.5px] relative shrink-0 w-[33px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 28.5">
        <g id="Container">
          <path d={svgPaths.p273fe80} fill="var(--fill-0, #006E28)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function IconDecoration() {
  return (
    <div className="bg-[rgba(39,178,77,0.1)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Icon Decoration">
      <Container4 />
    </div>
  );
}

function IconDecorationMargin() {
  return (
    <div className="content-stretch flex flex-col h-[72px] items-start pb-[8px] relative shrink-0 w-[64px]" data-name="Icon Decoration:margin">
      <IconDecoration />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[36px] text-center tracking-[-0.9px] w-[358.42px]">
        <p className="leading-[40px]">Report Charger Issue</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-center max-w-[448px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[88px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[18px] text-center w-[418.18px]">
        <p className="leading-[29.25px] mb-0">{`Tell us what's happening and we'll guide you`}</p>
        <p className="leading-[29.25px] mb-0">through the safest next steps. This process takes</p>
        <p className="leading-[29.25px]">less than 2 minutes.</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-[418.18px]" data-name="Container">
      <Heading />
      <Container6 />
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0" data-name="Margin">
      <Container5 />
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-gradient-to-r content-stretch flex from-[#006e28] items-center justify-center px-[48px] py-[16px] relative rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 to-[#27b24d]" data-name="Button">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[18px] text-center text-white w-[106.44px]">
        <p className="leading-[28px]">Start Report</p>
      </div>
    </div>
  );
}

function PrimaryAction() {
  return (
    <div className="content-stretch flex flex-col items-center pt-[16px] relative shrink-0 w-full" data-name="Primary Action">
      <Button1 />
    </div>
  );
}

function PrimaryActionMargin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 w-full" data-name="Primary Action:margin">
      <PrimaryAction />
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[17.5px] relative shrink-0 w-[18.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.3333 17.5">
        <g id="Container">
          <path d={svgPaths.pb849500} fill="var(--fill-0, #5DE074)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative">
        <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] text-center tracking-[1.2px] uppercase w-[342.03px]">
          <p className="leading-[16px]">Verified RExharge Infrastructure Support</p>
        </div>
      </div>
    </div>
  );
}

function TrustNote() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center pt-[25px] relative shrink-0 w-full" data-name="Trust Note">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container7 />
      <Container8 />
    </div>
  );
}

function TrustNoteMargin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[24px] relative shrink-0 w-full" data-name="Trust Note:margin">
      <TrustNote />
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center relative w-full">
        <IconDecorationMargin />
        <Margin />
        <PrimaryActionMargin />
        <TrustNoteMargin />
      </div>
    </div>
  );
}

function CentralReportCard() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full" data-name="Central Report Card">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="content-stretch flex flex-col items-start p-[49px] relative w-full">
        <Container3 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[20px] relative shrink-0 w-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
        <g id="Container">
          <path d={svgPaths.p12df5c00} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] w-[108.78px]">
        <p className="leading-[20px]">Electrical Safety</p>
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#f5f3f3] col-1 h-[56px] justify-self-stretch relative rounded-[4px] row-1 shrink-0" data-name="Background">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[16px] relative size-full">
          <Container9 />
          <Container10 />
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[20px] relative shrink-0 w-[16px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
        <g id="Container">
          <path d={svgPaths.p1869180} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] w-[95.63px]">
        <p className="leading-[20px]">Auto-Location</p>
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="bg-[#f5f3f3] col-2 h-[56px] justify-self-stretch relative rounded-[4px] row-1 shrink-0" data-name="Background">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[11.99px] items-center p-[16px] relative size-full">
          <Container11 />
          <Container12 />
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="h-[18px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 18">
        <g id="Container">
          <path d={svgPaths.p20cc9b00} fill="var(--fill-0, #3E4A3C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] w-[93.55px]">
        <p className="leading-[20px]">24/7 Dispatch</p>
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="bg-[#f5f3f3] col-3 h-[56px] justify-self-stretch relative rounded-[4px] row-1 shrink-0" data-name="Background">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[11.99px] items-center p-[16px] relative size-full">
          <Container13 />
          <Container14 />
        </div>
      </div>
    </div>
  );
}

function ContextualGridAsymmetricLayoutHint() {
  return (
    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[_56px] opacity-60 relative shrink-0 w-full" data-name="Contextual Grid (Asymmetric Layout Hint)">
      <Background />
      <Background1 />
      <Background2 />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start max-w-[672px] relative shrink-0 w-[672px]" data-name="Container">
      <CentralReportCard />
      <ContextualGridAsymmetricLayoutHint />
    </div>
  );
}

function MainContentTaskFocusedShellNavigationSuppressedPerRule() {
  return (
    <div className="relative shrink-0 w-full" data-name="Main Content: Task-Focused Shell (Navigation Suppressed per Rule)">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[103.62px] pt-[103.63px] px-[24px] relative w-full">
          <Container2 />
        </div>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start leading-[0] not-italic relative shrink-0" data-name="Paragraph">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center relative shrink-0 text-[#0f172a] text-[18px] w-[83.84px]">
        <p className="leading-[28px]">RExharge</p>
      </div>
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[444.78px]">
        <p className="leading-[16px]">© 2024 RExharge Infrastructure. Engineered for Reliability.</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[106.39px]">
        <p className="leading-[16px]">Privacy Policy</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[123.75px]">
        <p className="leading-[16px]">Terms of Service</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[106.47px]">
        <p className="leading-[16px]">System Status</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[127.08px]">
        <p className="leading-[16px]">Contact Support</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex gap-[24px] h-[16px] items-start justify-center relative shrink-0" data-name="Container">
      <Link3 />
      <Link4 />
      <Link5 />
      <Link6 />
    </div>
  );
}

function Container15() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] relative w-full">
        <Paragraph />
        <Container16 />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.15)] border-solid border-t inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start pb-[48px] pt-[49px] px-[24px] relative w-full">
        <Container15 />
      </div>
    </div>
  );
}

export default function Component1WelcomeStartReport() {
  return (
    <div className="bg-[#fbf9f8] content-stretch flex flex-col items-start relative size-full" data-name="1. Welcome / Start Report">
      <HeaderTopAppBar />
      <MainContentTaskFocusedShellNavigationSuppressedPerRule />
      <Footer />
    </div>
  );
}