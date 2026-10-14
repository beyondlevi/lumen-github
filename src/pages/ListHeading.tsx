import {TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';

/** The repository a list belongs to, above its rows. */
export function ListHeading({text}: {text: string}) {
  return (
    <TextView as="p" textStyle={TextStyle.META2_EMPHASIZED} textColor={TextColor.SECONDARY} className="list-heading">
      {text}
    </TextView>
  );
}
