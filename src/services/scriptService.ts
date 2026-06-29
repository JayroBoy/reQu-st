import { getQuickJS } from 'quickjs-emscripten';
import type { ScriptContext, ScriptResult } from '../types/script';

export async function runScript(script: string, context: ScriptContext): Promise<ScriptResult> {
  const logs: string[] = [];
  const envUpdates: Record<string, string> = {};

  try {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    // 1. Inject `response` object
    const responseHandle = vm.newObject();
    
    // Set status
    vm.setProp(responseHandle, 'status', vm.newNumber(context.response.status));
    
    // Set statusText
    vm.setProp(responseHandle, 'statusText', vm.newString(context.response.statusText));
    
    // Set body
    vm.setProp(responseHandle, 'body', vm.newString(context.response.body));
    
    // Set time
    vm.setProp(responseHandle, 'time', vm.newNumber(context.response.time));
    
    // Set headers
    const headersHandle = vm.newObject();
    for (const [key, value] of Object.entries(context.response.headers)) {
      vm.setProp(headersHandle, key, vm.newString(value));
    }
    vm.setProp(responseHandle, 'headers', headersHandle);
    
    vm.setProp(vm.global, 'response', responseHandle);
    headersHandle.dispose();
    responseHandle.dispose();

    // 2. Inject `env` object
    const envHandle = vm.newObject();
    
    const getHandle = vm.newFunction('get', (keyHandle) => {
      const key = vm.getString(keyHandle);
      const val = context.env.get(key);
      return val !== undefined ? vm.newString(val) : vm.undefined;
    });
    vm.setProp(envHandle, 'get', getHandle);
    getHandle.dispose();
    
    const setHandle = vm.newFunction('set', (keyHandle, valHandle) => {
      const key = vm.getString(keyHandle);
      const val = vm.getString(valHandle);
      envUpdates[key] = val;
      return vm.undefined;
    });
    vm.setProp(envHandle, 'set', setHandle);
    setHandle.dispose();
    
    vm.setProp(vm.global, 'env', envHandle);
    envHandle.dispose();

    // 3. Inject `console` object
    const consoleHandle = vm.newObject();
    const logHandle = vm.newFunction('log', (...args) => {
      const msg = args.map(arg => vm.dump(arg)).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logs.push(msg);
      return vm.undefined;
    });
    vm.setProp(consoleHandle, 'log', logHandle);
    logHandle.dispose();
    vm.setProp(vm.global, 'console', consoleHandle);
    consoleHandle.dispose();

    // 4. Run the script
    const result = vm.evalCode(script);
    if (result.error) {
      const errorStr = vm.dump(result.error) as any;
      vm.dispose();
      return { logs, envUpdates, error: errorStr.message || String(errorStr) };
    }
    
    result.value.dispose();
    vm.dispose();

    return { logs, envUpdates };
  } catch (err: any) {
    return { logs, envUpdates, error: err.message || 'Unknown execution error' };
  }
}
