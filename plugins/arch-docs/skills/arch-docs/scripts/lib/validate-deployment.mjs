export function validateDeployment({ model }) {
  return model.elements
    .filter((e) => e.kind === 'container' && !model.deployed.includes(e.id))
    .map((e) => ({
      check: 'deployment',
      message: `container "${e.title}" (${e.id}) has no instanceOf in any deployment node`,
    }));
}
