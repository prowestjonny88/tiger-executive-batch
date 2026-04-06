import svgPaths from "./svg-cwyu35rr3g";

function Svg() {
  return (
    <div className="absolute left-[447px] size-[128px] top-px" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 128 128">
        <g clipPath="url(#clip0_2_800)" id="SVG">
          <path d="M0 0H128V128L0 0" fill="var(--fill-0, #006E28)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_2_800">
            <rect fill="white" height="128" width="128" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 1">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[24px] tracking-[-0.6px] w-full">
        <p className="leading-[32px]">Upload a Photo</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] w-full">
        <p className="leading-[26px]">A clear photo helps our team diagnose the issue quickly.</p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Header">
      <Heading />
      <Container1 />
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[27px] relative shrink-0 w-[30px]" data-name="Container">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 30 27">
        <g id="Container">
          <path d={svgPaths.p177cbc00} fill="var(--fill-0, #006E28)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#e4e2e2] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[64px]" data-name="Background">
      <Container3 />
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] text-center w-[188.63px]">
        <p className="leading-[24px]">Tap to capture or upload</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[16px] text-center w-[173.19px]">
        <p className="leading-[24px]">JPEG, PNG up to 10MB</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[188.63px]" data-name="Container">
      <Container5 />
      <Container6 />
    </div>
  );
}

function Container2() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-center p-[32px] relative">
        <Background />
        <Container4 />
      </div>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-[#efefef] relative shrink-0" data-name="Input">
      <div className="content-stretch flex items-start justify-center overflow-clip px-[8px] py-[3px] relative rounded-[inherit]">
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-black text-center w-[89.14px]">
          <p className="leading-[24px]">Choose File</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-2 border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function InputUploadPhoto() {
  return (
    <div className="absolute inset-[2px] opacity-0" data-name="Input - Upload photo">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-center overflow-clip pb-[246px] relative rounded-[inherit] size-full">
        <Input />
        <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#1b1c1c] text-[16px] w-[109.08px]">
          <p className="leading-[24px]">No file chosen</p>
        </div>
      </div>
    </div>
  );
}

function UploadArea() {
  return (
    <div className="bg-[#f5f3f3] content-stretch flex flex-col items-center justify-center min-h-[280px] px-[2px] py-[42px] relative rounded-[2px] shrink-0 w-full" data-name="Upload Area">
      <div aria-hidden="true" className="absolute border-2 border-[#bdcab9] border-dashed inset-0 pointer-events-none rounded-[2px]" />
      <Container2 />
      <InputUploadPhoto />
    </div>
  );
}

function Heading1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Heading 3">
      <div className="bg-[#bdcab9] h-px shrink-0 w-[16px]" data-name="Horizontal Divider" />
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[1.2px] uppercase w-[101.5px]">
        <p className="leading-[16px]">Capture Tips</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[31.64px] relative">
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[63.69px]">
          <p className="leading-[16px] mb-0">Include the</p>
          <p className="leading-[16px]">screen</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder() {
  return (
    <div className="bg-[#f5f3f3] col-1 h-[56px] justify-self-stretch relative rounded-[2px] row-1 shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#7bfd8d] border-l-2 border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex gap-[12px] items-start pl-[14px] pr-[12px] py-[12px] relative size-full">
        <div className="h-[13.5px] relative shrink-0 w-[15px]" data-name="Icon">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 13.5">
            <path d={svgPaths.p19c07780} fill="var(--fill-0, #00531C)" id="Icon" />
          </svg>
        </div>
        <Container8 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[8.47px] relative">
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[86.86px]">
          <p className="leading-[16px] mb-0">Show the</p>
          <p className="leading-[16px]">connector area</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder1() {
  return (
    <div className="bg-[#f5f3f3] col-2 h-[56px] justify-self-stretch relative rounded-[2px] row-1 shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#7bfd8d] border-l-2 border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex gap-[12px] items-start pl-[14px] pr-[12px] py-[12px] relative size-full">
        <div className="relative shrink-0 size-[13.5px]" data-name="Icon">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.5 13.5">
            <path d={svgPaths.p2d5bbe80} fill="var(--fill-0, #00531C)" id="Icon" />
          </svg>
        </div>
        <Container9 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[3.07px] relative">
        <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[32px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] w-[92.26px]">
          <p className="leading-[16px] mb-0">Avoid direct sun</p>
          <p className="leading-[16px]">glare</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundVerticalBorder2() {
  return (
    <div className="bg-[#f5f3f3] col-3 h-[56px] justify-self-stretch relative rounded-[2px] row-1 shrink-0" data-name="Background+VerticalBorder">
      <div aria-hidden="true" className="absolute border-[#7bfd8d] border-l-2 border-solid inset-0 pointer-events-none rounded-[2px]" />
      <div className="content-stretch flex gap-[12px] items-start pl-[14px] pr-[12px] py-[12px] relative size-full">
        <div className="relative shrink-0 size-[16.5px]" data-name="Icon">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.5 16.5">
            <path d={svgPaths.p33c29780} fill="var(--fill-0, #00531C)" id="Icon" />
          </svg>
        </div>
        <Container10 />
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="gap-x-[12px] gap-y-[12px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[_56px] relative shrink-0 w-full" data-name="Container">
      <BackgroundVerticalBorder />
      <BackgroundVerticalBorder1 />
      <BackgroundVerticalBorder2 />
    </div>
  );
}

function CaptureTips() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Capture Tips">
      <Heading1 />
      <Container7 />
    </div>
  );
}

function Label() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Label">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">Charger ID (optional)</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px min-w-px overflow-clip relative" data-name="Container">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-[rgba(62,74,60,0.5)] w-full">
        <p className="leading-[normal]">e.g. RX-2049-A</p>
      </div>
    </div>
  );
}

function Input1() {
  return (
    <div className="bg-[#efeded] relative shrink-0 w-full" data-name="Input">
      <div className="flex flex-row justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start justify-center px-[16px] py-[15px] relative w-full">
          <Container11 />
        </div>
      </div>
    </div>
  );
}

function OptionalField() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start pt-[8px] relative shrink-0 w-full" data-name="Optional Field">
      <Label />
      <Input1 />
    </div>
  );
}

function Container12() {
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
    <div className="bg-gradient-to-r content-stretch flex from-[#006e28] gap-[7.99px] items-center justify-center py-[16px] relative shrink-0 to-[#27b24d] w-full" data-name="Button">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white tracking-[0.4px] w-[74.47px]">
        <p className="leading-[24px]">Continue</p>
      </div>
      <Container12 />
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center py-[12px] relative shrink-0 w-full" data-name="Button">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#3e4a3c] text-[14px] text-center w-[83.59px]">
        <p className="leading-[20px]">Skip for now</p>
      </div>
    </div>
  );
}

function Cta() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start pt-[8px] relative shrink-0 w-full" data-name="CTA">
      <Button />
      <Button1 />
    </div>
  );
}

function Container() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[32px] items-start relative w-full">
        <Header />
        <UploadArea />
        <CaptureTips />
        <OptionalField />
        <Cta />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-white max-w-[576px] relative shrink-0 w-[576px]" data-name="Background+Border">
      <div className="content-stretch flex flex-col items-start max-w-[inherit] overflow-clip p-[49px] relative rounded-[inherit] w-full">
        <Svg />
        <Container />
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(189,202,185,0.15)] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function MainContentTaskCanvas() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-0 p-[48px] right-0 top-[73px]" data-name="Main Content: Task Canvas">
      <BackgroundBorder />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#0f172a] text-[18px] w-[83.84px]">
        <p className="leading-[28px]">RExharge</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[12px] tracking-[0.6px] uppercase w-[444.78px]">
        <p className="leading-[16px]">© 2024 RExharge Infrastructure. Engineered for Reliability.</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-[444.78px]" data-name="Container">
      <Container15 />
      <Container16 />
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

function Container17() {
  return (
    <div className="content-stretch flex gap-[24px] h-[16px] items-start justify-center relative shrink-0" data-name="Container">
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container13() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] px-[24px] py-[48px] relative w-full">
          <Container14 />
          <Container17 />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute bg-[#f8fafc] content-stretch flex flex-col items-start left-0 pt-px right-0 top-[1033px]" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.15)] border-solid border-t inset-0 pointer-events-none" />
      <Container13 />
    </div>
  );
}

function Container19() {
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
    <div className="content-stretch flex flex-col items-start px-[12px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[82.53px]">
        <p className="leading-[24px]">Dashboard</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[6px] pt-[4px] px-[12px] relative shrink-0" data-name="Link">
      <div aria-hidden="true" className="absolute border-[#15803d] border-b-2 border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#15803d] text-[16px] w-[62.22px]">
        <p className="leading-[24px]">Support</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="content-stretch flex flex-col items-start px-[12px] py-[4px] relative shrink-0" data-name="Link">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] w-[102.77px]">
        <p className="leading-[24px]">Infrastructure</p>
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
    <div className="content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[#64748b] text-[16px] text-center w-[48.58px]">
        <p className="leading-[24px]">Safety</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#006e28] content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative shrink-0" data-name="Button">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium h-[24px] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-white w-[66.31px]">
        <p className="leading-[24px]">Get Help</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Container">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Container18() {
  return (
    <div className="max-w-[1280px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between max-w-[inherit] pl-[24px] pr-[24.02px] py-[16px] relative w-full">
          <Container19 />
          <Nav />
          <Container20 />
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-start left-0 pb-px right-0 top-0" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[rgba(189,202,185,0.15)] border-b border-solid inset-0 pointer-events-none" />
      <Container18 />
    </div>
  );
}

export default function Component2PhotoUpload() {
  return (
    <div className="bg-[#fbf9f8] relative size-full" data-name="2. Photo Upload">
      <MainContentTaskCanvas />
      <Footer />
      <HeaderTopAppBar />
    </div>
  );
}