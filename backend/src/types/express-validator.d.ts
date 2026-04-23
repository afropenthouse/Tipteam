declare module "express-validator" {
  function expressValidator(options?: any): any;
  
  namespace expressValidator {
    export function body(field: string): any;
    export function validationResult(req: any): any;
    export function check(field: string | string[]): any;
    export function checkExact(schema: any): any;
    export function checkSchema(schema: any): any;
    export function cookie(field: string): any;
    export function header(field: string): any;
    export function param(field: string): any;
    export function query(field: string): any;
    export function buildCheckFunction(locations: any): any;
  }
  
  export = expressValidator;
}
