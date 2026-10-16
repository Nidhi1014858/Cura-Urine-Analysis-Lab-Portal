export const jsonTransform = (schema) => {
  schema.set('toJSON', {
    transform: (doc, ret) => {
      if (ret._id !== undefined && ret._id !== null) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      delete ret.__v;
      delete ret.password;
      delete ret.duplicateFingerprint;
      return ret;
    }
  });
};
