export default {
  getLettersInPuzzle: (puzzle: string, letter: string): number => puzzle.match(new RegExp(letter, 'g'))?.length ?? 0,
  letterIsVowel: (letter: string): boolean => ['a', 'e', 'i', 'o', 'u'].includes(letter),

  wordWrap: (sentence: string, maxLength: number): string[] => {
    // Initialize variables to store the current line and the remaining text
    let line = "";
    let remaining = sentence;

    // Create an array to store the lines
    let lines = [];

    // Loop until there is no more text to process
    while (remaining.length > 0) {
      // Find the next word in the remaining text
      let spaceIndex = remaining.indexOf(" ");
      let nextWord;
      if (spaceIndex === -1) {
        // If there are no more spaces, the next word is the rest of the text
        nextWord = remaining;
        remaining = "";
      } else {
        // Otherwise, the next word is everything up to the next space
        nextWord = remaining.substring(0, spaceIndex);
        remaining = remaining.substring(spaceIndex + 1);
      }

      // Check if adding the next word to the current line would exceed the maximum length
      if (line.length + nextWord.length + 1 > maxLength) {
        // If it would exceed the maximum length, add the current line to the lines array and reset the current line
        lines.push(line);
        line = nextWord;
      } else {
        // Otherwise, add the next word to the current line with a space
        if (line.length != 0) line += " ";
        line += nextWord;
      }
    }

    // Add the final line to the lines array
    lines.push(line);

    // Return the array of lines
    return lines;
  },

  getEmojiBoard(puzzle: string, guessedLetters: string[]): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const fullwidth = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ';
    let board = [];

    const lines = this.wordWrap(puzzle, 12);

    if (lines.length < 3) {
      board.push('　🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩　');
    }

    // FIXME: left align all lines if can't exactly center?
    // if last halfpad and current halfpad are 1 away, flip floor/ceil?
    for (let line of lines) {
      let boardLine = '';
      const lineLength = board.length == 0 || board.length == 3 ? 12 : 14
      let halfPad = (lineLength - line.length) / 2;

      if (lineLength == 12) boardLine += '　';
      boardLine += '🟩'.repeat(Math.floor(halfPad));

      for (let letter of line) {
        if (letter == ' ') boardLine += '🟩';
        else if (letters.includes(letter) == false) boardLine += letter; // - & ? ' . ! :
        else if (guessedLetters.includes(letter)) boardLine += fullwidth[letters.indexOf(letter)];
        else boardLine += '⬜';
      }

      boardLine += '🟩'.repeat(Math.ceil(halfPad));
      if (lineLength == 12) boardLine += '　';

      board.push(boardLine);
    }

    if (board.length == 2) board.push('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
    if (board.length == 3) board.push('　🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩　');

    return board.join('\n');
  }
}