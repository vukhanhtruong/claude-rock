// The order is the point.
//
// `likec4 gen webcomponent` is not a validation gate: it produced a 2.2 MB
// bundle from a workspace carrying 194 validation errors — duplicate element ids
// from two conflicting `specification` blocks — silently, exit 0. The bundle
// renders, the viewer builds, and the only symptom is a model that quietly is
// not the one anybody wrote.
//
// viewer.md used to say "run `npx likec4 validate <dir>` first". That is the
// same shape of defect as the palette instruction it sits next to: a
// deterministic invariant carried by a sentence, correct and unenforced. Putting
// validate in front of gen in one list makes skipping it a code change rather
// than an omission.
export function likec4Steps({ dir, out }) {
  return [
    ['likec4', ['validate', dir]],
    // --webcomponent-prefix pins the tag to <c4-view>. Omit it and LikeC4 emits
    // <likec4-view>, the template's markers never match, and every diagram
    // renders blank with no error.
    ['likec4', ['gen', 'webcomponent', '--webcomponent-prefix', 'c4', '--outfile', out, dir]],
  ];
}
