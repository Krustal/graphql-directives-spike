const { SchemaDirectiveVisitor } = require("apollo-server");

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    console.log("field", field);
    console.log("field args", Object.keys(this), this.context);
  }
  visitObject(object, something) {
    console.log("object", object);
    console.log("object args", Object.keys(this.context));
  }
  ensureFieldsWrapped(objectType) {}
}

module.exports = AuthDirective;
