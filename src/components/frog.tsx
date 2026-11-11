import Svg, { G, Path } from 'react-native-svg';

import { FROG_EYE_PATH, FROG_SOLID_PATHS, FROG_VIEWBOX } from '@/components/frog-paths';

/** The Hoppr mascot: a leaping frog silhouette, facing right. Square, `size` points wide. */
export function Frog({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={FROG_VIEWBOX}>
      <G fill={color}>
        {FROG_SOLID_PATHS.map((d, i) => (
          <Path key={i} d={d} />
        ))}
        <Path d={FROG_EYE_PATH} fillRule="evenodd" />
      </G>
    </Svg>
  );
}
