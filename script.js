/*
 * JavaScript implementation of Password-Based Key Derivation Function 2
 * (PBKDF2) as defined in RFC 2898.
 * Version 1.5
 * Copyright (c) 2007, 2008, 2009, 2010, 2011, 2012, 2013 Parvez Anandam
 * parvez@anandam.com
 * http://anandam.com/pbkdf2
 *
 * Distributed under the BSD license
 *
 * Uses Paul Johnston's excellent SHA-1 JavaScript library sha1.js:
 * http://pajhome.org.uk/crypt/md5/sha1.html
 * (uses the binb_sha1(), rstr2binb(), binb2str(), rstr2hex() functions from that libary)
 *
 * Thanks to Felix Gartsman for pointing out a bug in version 1.0
 * Thanks to Thijs Van der Schaeghe for pointing out a bug in version 1.1
 * Thanks to Richard Gautier for asking to clarify dependencies in version 1.2
 * Updated contact information from version 1.3
 * Thanks to Stuart Heinrich for pointing out updates to PAJ's SHA-1 library in version 1.4
 */

/*
 * The four arguments to the constructor of the PBKDF2 object are
 * the password, salt, number of iterations and number of bytes in
 * generated key. This follows the RFC 2898 definition: PBKDF2 (P, S, c, dkLen)
 *
 * The method deriveKey takes two parameters, both callback functions:
 * the first is used to provide status on the computation, the second
 * is called with the result of the computation (the generated key in hex).
 *
 * Example of use:
 *
 *    <script src="sha1.js"></script>
 *    <script src="pbkdf2.js"></script>
 *    <script>
 *    var mypbkdf2 = new PBKDF2("mypassword", "saltines", 1000, 16);
 *    var status_callback = function(percent_done) {
 *        document.getElementById("status").innerHTML = "Computed " + percent_done + "%"};
 *    var result_callback = function(key) {
 *        document.getElementById("status").innerHTML = "The derived key is: " + key};
 *    mypbkdf2.deriveKey(status_callback, result_callback);
 *    </script>
 *    <div id="status"></div>
 *
 */

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS 180-1
 * Version 2.2 Copyright Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase        */

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input) {
  try {
    hexcase;
  } catch (e) {
    hexcase = 0;
  }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for (var i = 0; i < input.length; i++) {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0f) + hex_tab.charAt(x & 0x0f);
  }
  return output;
}

/*
 * Convert a raw string to an array of big-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binb(input) {
  var output = Array(input.length >> 2);
  for (var i = 0; i < output.length; i++) output[i] = 0;
  for (var i = 0; i < input.length * 8; i += 8)
    output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  return output;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2rstr(input) {
  var output = "";
  for (var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i >> 5] >>> (24 - (i % 32))) & 0xff);
  return output;
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function binb_sha1(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - (len % 32));
  x[(((len + 64) >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;
  var e = -1009589776;

  for (var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for (var j = 0; j < 80; j++) {
      if (j < 16) w[j] = x[i + j];
      else w[j] = bit_rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      var t = safe_add(
        safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)),
        safe_add(safe_add(e, w[j]), sha1_kt(j))
      );
      e = d;
      d = c;
      c = bit_rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d) {
  if (t < 20) return (b & c) | (~b & d);
  if (t < 40) return b ^ c ^ d;
  if (t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t) {
  return t < 20
    ? 1518500249
    : t < 40
    ? 1859775393
    : t < 60
    ? -1894007588
    : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y) {
  var lsw = (x & 0xffff) + (y & 0xffff);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

function PBKDF2(password, salt, num_iterations, num_bytes) {
  // Remember the password and salt
  var m_bpassword = rstr2binb(password);
  var m_salt = salt;

  // Total number of iterations
  var m_total_iterations = num_iterations;

  // Run iterations in chunks instead of all at once, so as to not block.
  // Define size of chunk here; adjust for slower or faster machines if necessary.
  var m_iterations_in_chunk = 10;

  // Iteration counter
  var m_iterations_done = 0;

  // Key length, as number of bytes
  var m_key_length = num_bytes;

  // The hash cache
  var m_hash = null;

  // The length (number of bytes) of the output of the pseudo-random function.
  // Since HMAC-SHA1 is the standard, and what is used here, it's 20 bytes.
  var m_hash_length = 20;

  // Number of hash-sized blocks in the derived key (called 'l' in RFC2898)
  var m_total_blocks = Math.ceil(m_key_length / m_hash_length);

  // Start computation with the first block
  var m_current_block = 1;

  // Used in the HMAC-SHA1 computations
  var m_ipad = new Array(16);
  var m_opad = new Array(16);

  // This is where the result of the iterations gets sotred
  var m_buffer = new Array(0x0, 0x0, 0x0, 0x0, 0x0);

  // The result
  var m_key = "";

  // This object
  var m_this_object = this;

  // The function to call with the result
  var m_result_func;

  // The function to call with status after computing every chunk
  var m_status_func;

  // Set up the HMAC-SHA1 computations
  if (m_bpassword.length > 16)
    m_bpassword = binb_sha1(m_bpassword, password.length * chrsz);
  for (var i = 0; i < 16; ++i) {
    m_ipad[i] = m_bpassword[i] ^ 0x36363636;
    m_opad[i] = m_bpassword[i] ^ 0x5c5c5c5c;
  }

  // Starts the computation
  this.deriveKey = function (status_callback, result_callback) {
    m_status_func = status_callback;
    m_result_func = result_callback;
    setTimeout(function () {
      m_this_object.do_PBKDF2_iterations();
    }, 0);
  };

  // The workhorse
  this.do_PBKDF2_iterations = function () {
    var iterations = m_iterations_in_chunk;
    if (m_total_iterations - m_iterations_done < m_iterations_in_chunk)
      iterations = m_total_iterations - m_iterations_done;

    for (var i = 0; i < iterations; ++i) {
      // compute HMAC-SHA1
      if (m_iterations_done == 0) {
        var salt_block =
          m_salt +
          String.fromCharCode((m_current_block >> 24) & 0xf) +
          String.fromCharCode((m_current_block >> 16) & 0xf) +
          String.fromCharCode((m_current_block >> 8) & 0xf) +
          String.fromCharCode(m_current_block & 0xf);

        m_hash = binb_sha1(
          m_ipad.concat(rstr2binb(salt_block)),
          512 + salt_block.length * 8
        );
        m_hash = binb_sha1(m_opad.concat(m_hash), 512 + 160);
      } else {
        m_hash = binb_sha1(m_ipad.concat(m_hash), 512 + m_hash.length * 32);
        m_hash = binb_sha1(m_opad.concat(m_hash), 512 + 160);
      }

      for (var j = 0; j < m_hash.length; ++j) m_buffer[j] ^= m_hash[j];

      m_iterations_done++;
    }

    // Call the status callback function
    m_status_func(
      ((m_current_block - 1 + m_iterations_done / m_total_iterations) /
        m_total_blocks) *
        100
    );

    if (m_iterations_done < m_total_iterations) {
      setTimeout(function () {
        m_this_object.do_PBKDF2_iterations();
      }, 0);
    } else {
      if (m_current_block < m_total_blocks) {
        // Compute the next block (T_i in RFC 2898)

        m_key += rstr2hex(binb2rstr(m_buffer));

        m_current_block++;
        m_buffer = new Array(0x0, 0x0, 0x0, 0x0, 0x0);
        m_iterations_done = 0;

        setTimeout(function () {
          m_this_object.do_PBKDF2_iterations();
        }, 0);
      } else {
        // We've computed the final block T_l; we're done.

        var tmp = rstr2hex(binb2rstr(m_buffer));
        m_key += tmp.substr(
          0,
          (m_key_length - (m_total_blocks - 1) * m_hash_length) * 2
        );

        // Call the result callback function
        m_result_func(m_key);
      }
    }
  };
}

const button = document.getElementById("generate-button");

button.addEventListener("click", (e) => {
  e.preventDefault();
  const ssidInput = document.getElementById("ssid");
  const passphraseInput = document.getElementById("passphrase");
  const pskKeyGenerator = document.getElementById("psk-key");
  const buttonSpinner = document.getElementById("button-spinner");
  const buttonText = document.getElementById("generate-button-text");

  var pskgen = new PBKDF2(
    passphraseInput.value,
    ssidInput.value,
    4096,
    256 / 8
  );

  buttonText.style.display = "none";
  buttonSpinner.style.display = "block";

  pskgen.deriveKey(
    () => {},
    (key) => {
      pskKeyGenerator.value = key;

      buttonText.style.display = "block";
      buttonSpinner.style.display = "none";

      setTimeout(() => {
        ssidInput.value = "";
        passphraseInput.value = "";
      }, 5000);
    }
  );
});
