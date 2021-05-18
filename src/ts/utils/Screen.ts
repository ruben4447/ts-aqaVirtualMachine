import CustomScreen from "../classes/Screen";
import { ITextMeasurements } from "../types/general";

/** Apply operations to a screen within an enclosed state */
export function withinState(screen: CustomScreen, action: (S: CustomScreen) => void) {
  screen.saveState();
  action(screen);
  screen.restoreState();
}

/** Write multi-line to the screen */
export function writeMultilineString(screen: CustomScreen, text: string, maxWidth?: number) {
  const lines = text.split(/\r\n|\n|\r/g), lastIndex = lines.length - 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let dim = screen.measureText(line);
    screen.writeString(line, false, maxWidth);
    if (i != lastIndex) screen.y += dim.height;
  }
}

export const errorForeground = '#f9accb';
export const errorBackground = '#4C2F36';

/** Write text to center of screen */
export function writeInCentre(screen: CustomScreen, text: string) {
  const dim = screen.measureText(text);
  screen.x = screen.getWidth() / 2 - dim.width / 2;
  screen.y = screen.getHeight() / 2 - dim.height / 2;
  screen.writeString(text);
}

export function writeMultilineInCentre(screen: CustomScreen, text: string) {
  const lines = text.split(/\r\n|\n|\r/g), lastIndex = lines.length - 1, Swidth = screen.getWidth(), Sheight = screen.getHeight();
  let textDimensions: ITextMeasurements[] = [], wholeTextHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    let dim = screen.measureText(lines[i]);
    textDimensions.push(dim);
    wholeTextHeight += dim.height * 1.1;
  }

  screen.y = Sheight / 2 - wholeTextHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], dim = textDimensions[i];
    screen.x = Swidth / 2 - dim.width / 2;
    screen.writeString(line, false);
    if (i != lastIndex) screen.y += dim.height;
  }
}

/** Font used in traditional "code" style */
export function loadCodeFont(screen: CustomScreen) {
  screen.updateFont(F => {
    F.family = 'consolas';
    F.size = 12;
  });
}