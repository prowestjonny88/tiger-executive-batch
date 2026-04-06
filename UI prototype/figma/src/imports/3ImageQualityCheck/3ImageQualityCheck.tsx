import svgPaths from "./svg-you6u56l61";
import imgEvChargingStation from "./d7f377fb3e2fe41926ad4335ad1401e786c79fcf.png";

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[24px] text-center tracking-[-0.6px] w-[234.39px]">
        <p className="leading-[32px]">Image Quality Check</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-center max-w-[512px] relative shrink-0 w-[512px]" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[48px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] text-center w-[466.9px]">
        <p className="leading-[24px] mb-0">{`We're verifying that the EV charger status lights are visible for`}</p>
        <p className="leading-[24px]">accurate diagnostic reporting.</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Container2 />
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[32px] relative shrink-0 w-full" data-name="Margin">
      <Container1 />
    </div>
  );
}

function EvChargingStation() {
  return (
    <div className="aspect-[4/3] relative rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full" data-name="EV charging station">
      <div className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 overflow-hidden pointer-events-none rounded-[4px]">
        <img alt="" className="absolute h-[133.34%] left-0 max-w-none top-[-16.67%] w-full" src={imgEvChargingStation} />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[12px] relative shrink-0 w-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 12">
        <g id="Container">
          <path d={svgPaths.p3594c080} fill="var(--fill-0, #1B1C1C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function OverlayBorderOverlayBlur() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(255,255,255,0.85)] h-[30px] left-[25px] rounded-[2px] top-[25px]" data-name="Overlay+Border+OverlayBlur">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.3)] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] h-full items-center px-[13px] py-[7px] relative">
        <Container5 />
        <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[12px] tracking-[1.2px] uppercase w-[75.52px]">
          <p className="leading-[16px]">Captured</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#f5f3f3] relative rounded-[8px] shrink-0 w-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex flex-col items-start p-[9px] relative w-full">
        <EvChargingStation />
        <OverlayBorderOverlayBlur />
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="col-[1/span_8] content-stretch flex flex-col items-start justify-self-stretch pb-[191.52px] relative row-1 self-start shrink-0" data-name="Container">
      <BackgroundBorder />
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 size-[12px]" data-name="Container">
      <div className="absolute bg-[#7bfd8d] inset-0 opacity-75 rounded-[12px]" data-name="Background" />
      <div className="bg-[#006e28] rounded-[12px] shrink-0 size-[12px]" data-name="Background" />
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[51.52px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[14px] w-[109.15px]">
        <p className="leading-[20px] mb-0">Checking image</p>
        <p className="leading-[20px]">clarity...</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative w-full">
        <Container8 />
        <Container9 />
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="relative shrink-0 size-[20px]" data-name="Icon">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
          <path d={svgPaths.p7b061c0} fill="var(--fill-0, #006E28)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 4">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[#003c12] text-[14px] w-[66.02px]">
        <p className="leading-[20px] mb-0">Analysis</p>
        <p className="leading-[20px]">Complete</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[0.875px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[91px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(0,60,18,0.8)] w-[106.71px]">
        <p className="leading-[22.75px] mb-0">The photo looks</p>
        <p className="leading-[22.75px] mb-0">good. We can</p>
        <p className="leading-[22.75px] mb-0">see the status</p>
        <p className="leading-[22.75px]">light clearly.</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col gap-[3.125px] items-start relative self-stretch shrink-0 w-[106.71px]" data-name="Container">
      <Heading1 />
      <Container13 />
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[135px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[11.99px] items-start relative size-full">
        <Container11 />
        <Container12 />
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(39,178,77,0.1)] relative rounded-[2px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(39,178,77,0.2)] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start p-[17px] relative w-full">
        <Container10 />
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p32510800} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-gradient-to-r from-[#006e28] relative rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 to-[#27b24d] w-full" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[12px] relative w-full">
          <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white w-[71.27px]">
            <p className="leading-[24px]">Continue</p>
          </div>
          <Container15 />
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p2e4c9f00} fill="var(--fill-0, #1B1C1C)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#e4e2e2] relative rounded-[4px] shrink-0 w-full" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[12px] relative w-full">
          <Container16 />
          <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] text-center w-[101.95px]">
            <p className="leading-[24px]">Retake Photo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start pt-[16px] relative w-full">
        <Button />
        <Button1 />
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[25px] relative w-full">
        <Container7 />
        <OverlayBorder />
        <Container14 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 5">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative w-full">
        <div className="flex flex-col font-['Inter:Extra_Bold',sans-serif] font-extrabold justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[10px] tracking-[1.5px] uppercase w-full">
          <p className="leading-[15px]">Diagnostic Metadata</p>
        </div>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[62.08px]">
        <p className="leading-[16px]">Luminance</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Bold',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#006e28] text-[12px] w-[36.02px]">
        <p className="leading-[16px]">88.4%</p>
      </div>
    </div>
  );
}

function Item() {
  return (
    <div className="content-stretch flex h-[16px] items-start justify-between relative shrink-0 w-full" data-name="Item">
      <Container17 />
      <Container18 />
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[60.34px]">
        <p className="leading-[16px]">Sharpness</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Bold',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#006e28] text-[12px] w-[36.02px]">
        <p className="leading-[16px]">92.1%</p>
      </div>
    </div>
  );
}

function Item1() {
  return (
    <div className="content-stretch flex h-[16px] items-start justify-between relative shrink-0 w-full" data-name="Item">
      <Container19 />
      <Container20 />
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[86.72px]">
        <p className="leading-[16px]">Asset Detected</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Bold',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[12px] w-[57.61px]">
        <p className="leading-[16px]">RX-990-B</p>
      </div>
    </div>
  );
}

function Item2() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Item">
      <div className="content-stretch flex items-start justify-between relative size-full">
        <Container21 />
        <Container22 />
      </div>
    </div>
  );
}

function List() {
  return (
    <div className="relative shrink-0 w-full" data-name="List">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start relative w-full">
        <Item />
        <Item1 />
        <Item2 />
      </div>
    </div>
  );
}

function BackgroundBorder2() {
  return (
    <div className="bg-[#f5f3f3] relative rounded-[2px] shrink-0 w-full" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[21px] relative w-full">
        <Heading2 />
        <List />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="col-[9/span_4] content-stretch flex flex-col gap-[24px] items-start justify-self-stretch relative row-1 self-start shrink-0" data-name="Container">
      <BackgroundBorder1 />
      <BackgroundBorder2 />
    </div>
  );
}

function Container3() {
  return (
    <div className="gap-x-[32px] gap-y-[32px] grid grid-cols-[repeat(12,minmax(0,1fr))] grid-rows-[_572px] relative shrink-0 w-full" data-name="Container">
      <Container4 />
      <Container6 />
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col items-center max-w-[768px] relative shrink-0 w-[768px]" data-name="Container">
      <Margin />
      <Container3 />
    </div>
  );
}

function Main() {
  return (
    <div className="relative shrink-0 w-full" data-name="Main">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[68px] pt-[116px] px-[24px] relative w-full">
          <Container />
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
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[15px] justify-center relative shrink-0 text-[#64748b] text-[10px] tracking-[0.5px] uppercase w-[372.16px]">
        <p className="leading-[15px]">© 2024 RExharge Infrastructure. Engineered for Reliability.</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[10px] tracking-[0.5px] uppercase w-[91.02px]">
        <p className="leading-[15px]">Privacy Policy</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[10px] tracking-[0.5px] uppercase w-[104.23px]">
        <p className="leading-[15px]">Terms of Service</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[10px] tracking-[0.5px] uppercase w-[90.64px]">
        <p className="leading-[15px]">System Status</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[10px] tracking-[0.5px] uppercase w-[107.28px]">
        <p className="leading-[15px]">Contact Support</p>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex gap-[24px] h-[15px] items-start justify-center relative shrink-0" data-name="Container">
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container23() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[48px] relative w-full">
          <Paragraph />
          <Container24 />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex flex-col items-start pt-px relative shrink-0 w-full" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[rgba(2,6,23,0.15)] border-solid border-t inset-0 pointer-events-none" />
      <Container23 />
    </div>
  );
}

function Container26() {
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
    <div className="content-stretch flex flex-col items-start py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[82.53px]">
        <p className="leading-[24px]">Dashboard</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[102.77px]">
        <p className="leading-[24px]">Infrastructure</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="content-stretch flex flex-col items-start py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[88.41px]">
        <p className="leading-[24px]">Diagnostics</p>
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
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[14px] text-center w-[43.27px]">
        <p className="leading-[20px]">Safety</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#006e28] content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative rounded-[4px] shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-white w-[58.36px]">
        <p className="leading-[20px]">Get Help</p>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex gap-[15.99px] items-center relative shrink-0" data-name="Container">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Container25() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] pl-[24px] pr-[23.99px] py-[16px] relative w-full">
          <Container26 />
          <Nav />
          <Container27 />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-start left-0 pb-px top-0 w-[1280px]" data-name="Header">
      <div aria-hidden="true" className="absolute border-[rgba(2,6,23,0.15)] border-b border-solid inset-0 pointer-events-none" />
      <Container25 />
    </div>
  );
}

export default function Component3ImageQualityCheck() {
  return (
    <div className="bg-[#fbf9f8] content-stretch flex flex-col items-start relative size-full" data-name="3. Image Quality Check">
      <Main />
      <Footer />
      <Header />
    </div>
  );
}