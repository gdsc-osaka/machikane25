import svgPaths from "./svg-4ct22mp038";
import imgRectangle1 from "figma:asset/537018a3eeeb5aefa4f960b882322d9ee4762a65.png";
import imgRectangle2 from "figma:asset/37aad076f4072d0921ffad3952a7c2b920210b77.png";
import { imgGroup, imgRectangle, imgGroup1, imgGroup2, imgGroup3, imgGroup4, imgGroup5, imgGroup6 } from "./svg-45a9t";

function Group() {
  return (
    <div className="absolute bottom-[0.02%] left-0 mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px] mask-size-[1599.22px_899.561px] right-[0.05%] top-[0.02%]" data-name="Group" style={{ maskImage: `url('${imgGroup}')` }}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1600 900">
        <g id="Group">
          <path d="M0 0H1599.22V899.561H0V0Z" fill="var(--fill-0, white)" id="Vector" />
          <path d="M0 0H1599.22V899.561H0V0Z" fill="var(--fill-0, white)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function ClipPathGroup() {
  return (
    <div className="absolute bottom-[0.02%] contents left-0 right-[0.05%] top-[0.02%]" data-name="Clip path group">
      <Group />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <div className="absolute inset-[10.02%_11.29%_10.07%_11.22%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.074px_0.449px] mask-size-[1239.73px_718.732px]" data-name="Rectangle" style={{ maskImage: `url('${imgRectangle}')` }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgRectangle1.src} />
        </div>
      </div>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <Group1 />
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <Group2 />
    </div>
  );
}

function Group4() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <div className="absolute inset-[10.02%_11.29%_10.07%_11.22%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0.074px_0.449px] mask-size-[1239.73px_718.732px]" data-name="Rectangle" style={{ maskImage: `url('${imgRectangle}')` }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgRectangle2.src} />
        </div>
      </div>
    </div>
  );
}

function Group5() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <Group4 />
    </div>
  );
}

function MaskGroup() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Mask group">
      <Group3 />
      <Group5 />
    </div>
  );
}

function Group6() {
  return (
    <div className="absolute contents inset-[10.02%_11.29%_10.07%_11.22%]" data-name="Group">
      <MaskGroup />
    </div>
  );
}

function ClipPathGroup1() {
  return (
    <div className="absolute contents inset-[10.07%_11.29%_10.07%_11.22%]" data-name="Clip path group">
      <Group6 />
    </div>
  );
}

function Group7() {
  return (
    <div className="[mask-clip:no-clip,_no-clip,_no-clip] [mask-composite:intersect,_intersect,_intersect] [mask-mode:alpha,_alpha,_alpha] [mask-repeat:no-repeat,_no-repeat,_no-repeat] absolute inset-[27.87%_57.15%_12.38%_13.7%] mask-position-[0px,_-0.592px,_0px_0px,_-0.818px,_0px] mask-size-[466.404px_536.902px,_468.521px_539.063px,_466.404px_536.902px]" data-name="Group" style={{ maskImage: `url('${imgGroup1}'), url('${imgGroup2}'), url('${imgGroup3}')` }}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 467 538">
        <g id="Group">
          <path d={svgPaths.p20c17600} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function ClipPathGroup2() {
  return (
    <div className="absolute contents inset-[27.87%_57.15%_12.48%_13.7%]" data-name="Clip path group">
      <Group7 />
    </div>
  );
}

function Group8() {
  return (
    <div className="absolute contents inset-[27.87%_57.15%_12.48%_13.7%]" data-name="Group">
      <ClipPathGroup2 />
    </div>
  );
}

function ClipPathGroup3() {
  return (
    <div className="absolute contents inset-[27.78%_57.05%_12.33%_13.66%]" data-name="Clip path group">
      <Group8 />
    </div>
  );
}

function Group9() {
  return (
    <div className="absolute contents inset-[27.78%_57.05%_12.33%_13.66%]" data-name="Group">
      <ClipPathGroup3 />
    </div>
  );
}

function Group10() {
  return (
    <div className="absolute contents inset-[27.78%_57.05%_12.33%_13.66%]" data-name="Group">
      <Group9 />
    </div>
  );
}

function ClipPathGroup4() {
  return (
    <div className="absolute contents inset-[27.87%_57.15%_12.48%_13.7%]" data-name="Clip path group">
      <Group10 />
    </div>
  );
}

function Group11() {
  return (
    <div className="absolute inset-[56.56%_71.8%_41.37%_26.99%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 19">
        <g id="Group">
          <path d={svgPaths.p1c7ddb00} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group12() {
  return (
    <div className="absolute contents inset-[56.56%_71.8%_41.37%_26.99%]" data-name="Group">
      <Group11 />
    </div>
  );
}

function Group13() {
  return (
    <div className="absolute contents inset-[56.56%_71.8%_41.37%_26.99%]" data-name="Group">
      <Group12 />
    </div>
  );
}

function Group14() {
  return (
    <div className="absolute inset-[56.42%_70.43%_41.36%_28.36%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Group">
          <path d={svgPaths.p17afe600} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group15() {
  return (
    <div className="absolute contents inset-[56.42%_70.43%_41.36%_28.36%]" data-name="Group">
      <Group14 />
    </div>
  );
}

function Group16() {
  return (
    <div className="absolute contents inset-[56.42%_70.43%_41.36%_28.36%]" data-name="Group">
      <Group15 />
    </div>
  );
}

function Group17() {
  return (
    <div className="[mask-clip:no-clip,_no-clip,_no-clip] [mask-composite:intersect,_intersect,_intersect] [mask-mode:alpha,_alpha,_alpha] [mask-repeat:no-repeat,_no-repeat,_no-repeat] absolute inset-[37.24%_16.01%_21.84%_60.36%] mask-position-[0px,_-0.604px,_0px_0px,_-0.769px,_0px] mask-size-[378.105px_368.25px,_379.502px_370.313px,_378.105px_368.25px]" data-name="Group" style={{ maskImage: `url('${imgGroup4}'), url('${imgGroup5}'), url('${imgGroup6}')` }}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 379 369">
        <g id="Group">
          <path d={svgPaths.p38fba500} fill="var(--fill-0, #A6A6A6)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function ClipPathGroup5() {
  return (
    <div className="absolute contents inset-[37.24%_16.01%_21.84%_60.36%]" data-name="Clip path group">
      <Group17 />
    </div>
  );
}

function Group18() {
  return (
    <div className="absolute contents inset-[37.24%_16.01%_21.84%_60.36%]" data-name="Group">
      <ClipPathGroup5 />
    </div>
  );
}

function ClipPathGroup6() {
  return (
    <div className="absolute contents inset-[37.15%_15.96%_21.7%_60.32%]" data-name="Clip path group">
      <Group18 />
    </div>
  );
}

function Group19() {
  return (
    <div className="absolute contents inset-[37.15%_15.96%_21.7%_60.32%]" data-name="Group">
      <ClipPathGroup6 />
    </div>
  );
}

function Group20() {
  return (
    <div className="absolute contents inset-[37.15%_15.96%_21.7%_60.32%]" data-name="Group">
      <Group19 />
    </div>
  );
}

function ClipPathGroup7() {
  return (
    <div className="absolute contents inset-[37.24%_16.01%_21.84%_60.36%]" data-name="Clip path group">
      <Group20 />
    </div>
  );
}

function Group21() {
  return (
    <div className="absolute inset-[56.64%_27.81%_41.11%_71.33%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 21">
        <g id="Group">
          <path d={svgPaths.p24f62000} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group22() {
  return (
    <div className="absolute contents inset-[56.64%_27.81%_41.11%_71.33%]" data-name="Group">
      <Group21 />
    </div>
  );
}

function Group23() {
  return (
    <div className="absolute contents inset-[56.64%_27.81%_41.11%_71.33%]" data-name="Group">
      <Group22 />
    </div>
  );
}

function Group24() {
  return (
    <div className="absolute inset-[56.67%_26.93%_41.55%_72.39%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 16">
        <g id="Group">
          <path d={svgPaths.p31b9c900} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group25() {
  return (
    <div className="absolute contents inset-[56.67%_26.93%_41.55%_72.39%]" data-name="Group">
      <Group24 />
    </div>
  );
}

function Group26() {
  return (
    <div className="absolute contents inset-[56.67%_26.93%_41.55%_72.39%]" data-name="Group">
      <Group25 />
    </div>
  );
}

function Group27() {
  return (
    <div className="absolute inset-[10.63%_60.59%_85.29%_37.1%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 38 37">
        <g id="Group">
          <path d={svgPaths.p110f1380} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group28() {
  return (
    <div className="absolute contents inset-[10.63%_60.59%_85.29%_37.1%]" data-name="Group">
      <Group27 />
    </div>
  );
}

function Group29() {
  return (
    <div className="absolute contents inset-[10.63%_60.59%_85.29%_37.1%]" data-name="Group">
      <Group28 />
    </div>
  );
}

function Group30() {
  return (
    <div className="absolute inset-[10.63%_57.95%_85.11%_39.66%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 39 39">
        <g id="Group">
          <path d={svgPaths.p1769e300} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group31() {
  return (
    <div className="absolute contents inset-[10.63%_57.95%_85.11%_39.66%]" data-name="Group">
      <Group30 />
    </div>
  );
}

function Group32() {
  return (
    <div className="absolute contents inset-[10.63%_57.95%_85.11%_39.66%]" data-name="Group">
      <Group31 />
    </div>
  );
}

function Group33() {
  return (
    <div className="absolute inset-[10.58%_55.3%_85.37%_42.34%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 38 37">
        <g id="Group">
          <path d={svgPaths.p10203380} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group34() {
  return (
    <div className="absolute contents inset-[10.58%_55.3%_85.37%_42.34%]" data-name="Group">
      <Group33 />
    </div>
  );
}

function Group35() {
  return (
    <div className="absolute contents inset-[10.58%_55.3%_85.37%_42.34%]" data-name="Group">
      <Group34 />
    </div>
  );
}

function Group36() {
  return (
    <div className="absolute inset-[10.63%_52.76%_85.14%_44.87%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 38 39">
        <g id="Group">
          <path d={svgPaths.p2d5a3980} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group37() {
  return (
    <div className="absolute contents inset-[10.63%_52.76%_85.14%_44.87%]" data-name="Group">
      <Group36 />
    </div>
  );
}

function Group38() {
  return (
    <div className="absolute contents inset-[10.63%_52.76%_85.14%_44.87%]" data-name="Group">
      <Group37 />
    </div>
  );
}

function Group39() {
  return (
    <div className="absolute inset-[10.96%_50.32%_85.15%_47.63%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 36">
        <g id="Group">
          <path d={svgPaths.p8f3d300} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group40() {
  return (
    <div className="absolute contents inset-[10.96%_50.32%_85.15%_47.63%]" data-name="Group">
      <Group39 />
    </div>
  );
}

function Group41() {
  return (
    <div className="absolute contents inset-[10.96%_50.32%_85.15%_47.63%]" data-name="Group">
      <Group40 />
    </div>
  );
}

function Group42() {
  return (
    <div className="absolute inset-[10.9%_47.7%_85.28%_50.6%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 35">
        <g id="Group">
          <path d={svgPaths.p62fa100} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group43() {
  return (
    <div className="absolute contents inset-[10.9%_47.7%_85.28%_50.6%]" data-name="Group">
      <Group42 />
    </div>
  );
}

function Group44() {
  return (
    <div className="absolute contents inset-[10.9%_47.7%_85.28%_50.6%]" data-name="Group">
      <Group43 />
    </div>
  );
}

function Group45() {
  return (
    <div className="absolute inset-[10.84%_45.17%_85.31%_53.06%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29 35">
        <g id="Group">
          <path d={svgPaths.p29a14e00} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group46() {
  return (
    <div className="absolute contents inset-[10.84%_45.17%_85.31%_53.06%]" data-name="Group">
      <Group45 />
    </div>
  );
}

function Group47() {
  return (
    <div className="absolute contents inset-[10.84%_45.17%_85.31%_53.06%]" data-name="Group">
      <Group46 />
    </div>
  );
}

function Group48() {
  return (
    <div className="absolute inset-[10.9%_42.49%_85.28%_55.81%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 35">
        <g id="Group">
          <path d={svgPaths.p62fa100} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group49() {
  return (
    <div className="absolute contents inset-[10.9%_42.49%_85.28%_55.81%]" data-name="Group">
      <Group48 />
    </div>
  );
}

function Group50() {
  return (
    <div className="absolute contents inset-[10.9%_42.49%_85.28%_55.81%]" data-name="Group">
      <Group49 />
    </div>
  );
}

function Group51() {
  return (
    <div className="absolute inset-[10.83%_39.86%_85.36%_58.06%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 35">
        <g id="Group">
          <path d={svgPaths.p2db75280} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group52() {
  return (
    <div className="absolute contents inset-[10.83%_39.86%_85.36%_58.06%]" data-name="Group">
      <Group51 />
    </div>
  );
}

function Group53() {
  return (
    <div className="absolute contents inset-[10.83%_39.86%_85.36%_58.06%]" data-name="Group">
      <Group52 />
    </div>
  );
}

function Group54() {
  return (
    <div className="absolute inset-[11.04%_38.1%_85.47%_61.49%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 32">
        <g id="Group">
          <path d={svgPaths.p2fd98e00} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group55() {
  return (
    <div className="absolute contents inset-[11.04%_38.1%_85.47%_61.49%]" data-name="Group">
      <Group54 />
    </div>
  );
}

function Group56() {
  return (
    <div className="absolute contents inset-[11.04%_38.1%_85.47%_61.49%]" data-name="Group">
      <Group55 />
    </div>
  );
}

export default function Component63603949() {
  return (
    <div className="bg-white relative size-full" data-name="6 3603949">
      <ClipPathGroup />
      <ClipPathGroup1 />
      <ClipPathGroup4 />
      <Group13 />
      <Group16 />
      <ClipPathGroup7 />
      <Group23 />
      <Group26 />
      <Group29 />
      <Group32 />
      <Group35 />
      <Group38 />
      <Group41 />
      <Group44 />
      <Group47 />
      <Group50 />
      <Group53 />
      <Group56 />
    </div>
  );
}