import { Hunk } from './hunk';

export class DiffEngine {
  ignoreWhitespace: boolean;
  lineEnding: string;

  constructor(ignoreWhitespace: boolean = false, lineEnding: string = '\n') {
    this.ignoreWhitespace = ignoreWhitespace;
    this.lineEnding = lineEnding;
  }

  createTwoWayDiff(oldText: string, newText: string): Hunk[] {
    const oldLines = oldText.split(this.lineEnding);
    const newLines = newText.split(this.lineEnding);
    const hunks: Hunk[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex >= oldLines.length) {
        const hunk = new Hunk(oldIndex + 1, 0, newIndex + 1, newLines.length - newIndex, []);
        hunk.lines = newLines.slice(newIndex).map(line => '+' + line);
        hunks.push(hunk);
        break;
      }

      if (newIndex >= newLines.length) {
        const hunk = new Hunk(oldIndex + 1, oldLines.length - oldIndex, newIndex + 1, 0, []);
        hunk.lines = oldLines.slice(oldIndex).map(line => '-' + line);
        hunks.push(hunk);
        break;
      }

      if (this.ignoreWhitespace) {
        if (oldLines[oldIndex].trim() === newLines[newIndex].trim()) {
          oldIndex++;
          newIndex++;
          continue;
        }
      } else {
        if (oldLines[oldIndex] === newLines[newIndex]) {
          oldIndex++;
          newIndex++;
          continue;
        }
      }

      let oldStart = oldIndex;
      let newStart = newIndex;
      const hunkLines: string[] = [];

      while (oldIndex < oldLines.length && newIndex < newLines.length) {
        const oldLine = this.ignoreWhitespace ? oldLines[oldIndex].trim() : oldLines[oldIndex];
        const newLine = this.ignoreWhitespace ? newLines[newIndex].trim() : newLines[newIndex];

        if (oldLine === newLine) {
          break;
        }

        if (oldIndex + 1 < oldLines.length && newIndex + 1 < newLines.length) {
          const nextOldLine = this.ignoreWhitespace ? oldLines[oldIndex + 1].trim() : oldLines[oldIndex + 1];
          const nextNewLine = this.ignoreWhitespace ? newLines[newIndex + 1].trim() : newLines[newIndex + 1];
          if (nextOldLine === nextNewLine) {
            hunkLines.push('-' + oldLines[oldIndex]);
            hunkLines.push('+' + newLines[newIndex]);
            oldIndex++;
            newIndex++;
            break;
          }
        }

        if (oldIndex < oldLines.length) {
          hunkLines.push('-' + oldLines[oldIndex]);
          oldIndex++;
        }

        if (newIndex < newLines.length) {
          hunkLines.push('+' + newLines[newIndex]);
          newIndex++;
        }
      }

      if (hunkLines.length > 0) {
        const hunk = new Hunk(oldStart + 1, oldIndex - oldStart, newStart + 1, newIndex - newStart, hunkLines);
        hunks.push(hunk);
      }
    }

    return hunks;
  }

  createThreeWayMerge(baseText: string, leftText: string, rightText: string): Hunk[] {
    const baseLines = baseText.split(this.lineEnding);
    const leftLines = leftText.split(this.lineEnding);
    const rightLines = rightText.split(this.lineEnding);
    const hunks: Hunk[] = [];

    let baseIndex = 0;
    let leftIndex = 0;
    let rightIndex = 0;

    while (baseIndex < baseLines.length || leftIndex < leftLines.length || rightIndex < rightLines.length) {
      if (baseIndex >= baseLines.length) {
        if (leftIndex < leftLines.length || rightIndex < rightLines.length) {
          const hunk = new Hunk(baseIndex + 1, 0, Math.min(leftIndex, rightIndex) + 1, Math.max(leftLines.length - leftIndex, rightLines.length - rightIndex), []);
          
          if (leftIndex < leftLines.length) {
            hunk.lines.push(...leftLines.slice(leftIndex).map(line => '+' + line));
          }
          if (rightIndex < rightLines.length) {
            hunk.lines.push(...rightLines.slice(rightIndex).map(line => '+' + line));
          }
          
          hunks.push(hunk);
        }
        break;
      }

      if (leftIndex < leftLines.length && rightIndex < rightLines.length) {
        if (leftLines[leftIndex] === rightLines[rightIndex]) {
          baseIndex++;
          leftIndex++;
          rightIndex++;
          continue;
        }
      }

      if (baseIndex < baseLines.length && leftIndex < leftLines.length) {
        if (baseLines[baseIndex] === leftLines[leftIndex]) {
          baseIndex++;
          leftIndex++;
          continue;
        }
      }

      if (baseIndex < baseLines.length && rightIndex < rightLines.length) {
        if (baseLines[baseIndex] === rightLines[rightIndex]) {
          baseIndex++;
          rightIndex++;
          continue;
        }
      }

      const oldStart = baseIndex;
      const newStart = Math.min(leftIndex, rightIndex);
      const hunkLines: string[] = [];

      while (baseIndex < baseLines.length || leftIndex < leftLines.length || rightIndex < rightLines.length) {
        let conflict = false;

        if (leftIndex < leftLines.length && rightIndex < rightLines.length) {
          if (leftLines[leftIndex] !== rightLines[rightIndex]) {
            conflict = true;
          }
        }

        if (conflict) {
          hunkLines.push('<<<<<<< LEFT');
          while (leftIndex < leftLines.length && (baseIndex >= baseLines.length || leftLines[leftIndex] !== baseLines[baseIndex])) {
            hunkLines.push(leftLines[leftIndex]);
            leftIndex++;
          }
          hunkLines.push('=======');
          while (rightIndex < rightLines.length && (baseIndex >= baseLines.length || rightLines[rightIndex] !== baseLines[baseIndex])) {
            hunkLines.push(rightLines[rightIndex]);
            rightIndex++;
          }
          hunkLines.push('>>>>>>> RIGHT');
          break;
        }

        if (leftIndex < leftLines.length && (baseIndex >= baseLines.length || leftLines[leftIndex] !== baseLines[baseIndex])) {
          hunkLines.push('+' + leftLines[leftIndex]);
          leftIndex++;
        } else if (rightIndex < rightLines.length && (baseIndex >= baseLines.length || rightLines[rightIndex] !== baseLines[baseIndex])) {
          hunkLines.push('+' + rightLines[rightIndex]);
          rightIndex++;
        } else if (baseIndex < baseLines.length) {
          baseIndex++;
          leftIndex++;
          rightIndex++;
        } else {
          break;
        }
      }

      if (hunkLines.length > 0) {
        const hunk = new Hunk(oldStart + 1, baseIndex - oldStart, newStart + 1, Math.max(leftIndex, rightIndex) - newStart, hunkLines);
        hunks.push(hunk);
      }
    }

    return hunks;
  }

  applyHunks(text: string, hunks: Hunk[]): string {
    const lines = text.split(this.lineEnding);
    let offset = 0;

    for (const hunk of hunks) {
      const insertPos = hunk.oldStart - 1 + offset;
      const linesToRemove = hunk.oldLines;
      const linesToAdd: string[] = [];

      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          linesToAdd.push(line.substring(1));
        } else if (line.startsWith('-')) {
          // Skip deletion lines
        } else if (line.startsWith(' ')) {
          linesToAdd.push(line.substring(1));
        } else {
          linesToAdd.push(line);
        }
      }

      lines.splice(insertPos, linesToRemove, ...linesToAdd);
      offset += linesToAdd.length - linesToRemove;
    }

    return lines.join(this.lineEnding);
  }

  mergeHunks(hunks1: Hunk[], hunks2: Hunk[]): Hunk[] {
    const merged: Hunk[] = [];
    let i = 0;
    let j = 0;

    while (i < hunks1.length || j < hunks2.length) {
      if (i >= hunks1.length) {
        merged.push(...hunks2.slice(j));
        break;
      }

      if (j >= hunks2.length) {
        merged.push(...hunks1.slice(i));
        break;
      }

      const hunk1 = hunks1[i];
      const hunk2 = hunks2[j];

      if (hunk1.oldStart + hunk1.oldLines <= hunk2.oldStart) {
        merged.push(hunk1);
        i++;
      } else if (hunk2.oldStart + hunk2.oldLines <= hunk1.oldStart) {
        merged.push(hunk2);
        j++;
      } else {
        // Overlapping hunks - merge them
        const mergedHunk = new Hunk(
          Math.min(hunk1.oldStart, hunk2.oldStart),
          Math.max(
            hunk1.oldStart + hunk1.oldLines,
            hunk2.oldStart + hunk2.oldLines
          ) - Math.min(hunk1.oldStart, hunk2.oldStart),
          Math.min(hunk1.newStart, hunk2.newStart),
          Math.max(
            hunk1.newStart + hunk1.newLines,
            hunk2.newStart + hunk2.newLines
          ) - Math.min(hunk1.newStart, hunk2.newStart),
          [...hunk1.lines, ...hunk2.lines]
        );
        merged.push(mergedHunk);
        i++;
        j++;
      }
    }

    return merged;
  }

  detectConflicts(hunks: Hunk[]): boolean {
    for (const hunk of hunks) {
      let inConflict = false;
      for (const line of hunk.lines) {
        if (line.startsWith('<<<<<<<')) {
          inConflict = true;
        } else if (line.startsWith('>>>>>>>')) {
          if (inConflict) {
            return true;
          }
        }
      }
    }
    return false;
  }

  convertToPatch(hunks: Hunk[]): string {
    const patchLines: string[] = [];
    
    for (const hunk of hunks) {
      patchLines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
      for (const line of hunk.lines) {
        patchLines.push(line);
      }
    }

    return patchLines.join(this.lineEnding);
  }

  parsePatch(patch: string): Hunk[] {
    const lines = patch.split(this.lineEnding);
    const hunks: Hunk[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(/^@@\s+-(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/);
      
      if (match) {
        const hunk = new Hunk(
          parseInt(match[1]),
          match[2] ? parseInt(match[2]) : 1,
          parseInt(match[3]),
          match[4] ? parseInt(match[4]) : 1,
          []
        );

        i++;
        while (i < lines.length && !lines[i].match(/^@@/)) {
          hunk.lines.push(lines[i]);
          i++;
        }

        hunks.push(hunk);
      } else {
        i++;
      }
    }

    return hunks;
  }
}
