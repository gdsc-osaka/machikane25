import imgTabletGif1 from "figma:asset/3cbead0f20114d09747e2dfcc77f3b6abce3890f.png";

/**
 * @figmaAssetKey 41e48fca68005c986d6ac74a61ace6598fe98d1d
 */
function TabletGif1({ className }: { className?: string }) {
  return (
    <div className={className} data-name="tabletGIF 1">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgTabletGif1.src} />
    </div>
  );
}

export default function TabletGif2() {
  return <TabletGif1 className="relative size-full" />;
}