import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { registerUser, setTokens, setStoredUser, sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP } from "../utils/api.js"
import "../css/Registration.css"

const Registration = () => {
  const navigate = useNavigate()

  // Form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState({})
  const [loading, setLoading] = useState(false)

  // Email OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailOtpLoading, setEmailOtpLoading] = useState(false)
  const [emailOtpMessage, setEmailOtpMessage] = useState("")
  const [emailCountdown, setEmailCountdown] = useState(0)

  // Phone OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)

  // Countdown timer helper
  const startCountdown = (setter) => {
    setter(30)
    const timer = setInterval(() => {
      setter(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Email OTP Flow ──
  const handleSendEmailOTP = async () => {
    if (!email.trim()) {
      setError(prev => ({ ...prev, email: "Email is required" }))
      return
    }
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(email)) {
      setError(prev => ({ ...prev, email: "Enter a valid email" }))
      return
    }

    setEmailOtpLoading(true)
    setEmailOtpMessage("")
    setError(prev => ({ ...prev, email: "", emailOtp: "" }))

    try {
      await sendEmailOTP(email)
      setEmailOtpSent(true)
      setEmailOtpMessage("Verification code sent! Check your email.")
      startCountdown(setEmailCountdown)
    } catch (err) {
      setError(prev => ({ ...prev, email: err.message }))
    } finally {
      setEmailOtpLoading(false)
    }
  }

  const handleVerifyEmailOTP = async () => {
    if (!emailOtp.trim() || emailOtp.length !== 6) {
      setError(prev => ({ ...prev, emailOtp: "Enter the 6-digit code" }))
      return
    }

    setEmailOtpLoading(true)
    setEmailOtpMessage("")

    try {
      const result = await verifyEmailOTP(email, emailOtp)
      if (result.success) {
        setEmailVerified(true)
        setEmailOtpMessage("✅ Email verified!")
      } else {
        setError(prev => ({ ...prev, emailOtp: result.message }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, emailOtp: err.message }))
    } finally {
      setEmailOtpLoading(false)
    }
  }

  // ── Phone OTP Flow ──
  const handleSendOTP = async () => {
    if (!phone.trim()) {
      setError(prev => ({ ...prev, phone: "Phone number is required" }))
      return
    }
    const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`

    setOtpLoading(true)
    setOtpMessage("")
    setError(prev => ({ ...prev, phone: "", otp: "" }))

    try {
      await sendOTP(phoneClean)
      setOtpSent(true)
      setOtpMessage("OTP sent! Check your phone.")
      startCountdown(setOtpCountdown)
    } catch (err) {
      setError(prev => ({ ...prev, phone: err.message }))
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError(prev => ({ ...prev, otp: "Enter the 6-digit OTP" }))
      return
    }
    const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`

    setOtpLoading(true)
    setOtpMessage("")

    try {
      const result = await verifyOTP(phoneClean, otp)
      if (result.success) {
        setPhoneVerified(true)
        setOtpMessage("✅ Phone verified!")
      } else {
        setError(prev => ({ ...prev, otp: result.message }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, otp: err.message }))
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Form Validation ──
  const validateForm = () => {
    let errors = {}
    if (!fullName.trim()) errors.fullName = "Full name is required"
    if (!email.trim()) errors.email = "Email is required"
    if (!phone.trim()) errors.phone = "Phone number is required"
    if (!password) errors.password = "Password is required"
    else if (password.length < 6) errors.password = "Password must be at least 6 characters"
    if (!confirmPassword) errors.confirmPassword = "Confirm password is required"
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match"

    setError(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError({})

    try {
      const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`
      const data = await registerUser({ fullName, email, password, phone: phoneClean })
      setTokens(data.accessToken, data.refreshToken)
      setStoredUser(data.user)
      setFullName("")
      setEmail("")
      setPhone("")
      setPassword("")
      setConfirmPassword("")
      navigate("/")
    } catch (err) {
      setError({ server: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        {error.server && (
          <p className="error-text" style={{ textAlign: "center", marginBottom: "10px" }}>
            {error.server}
          </p>
        )}

        {/* Full Name */}
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        {error.fullName && <p className="error-text">{error.fullName}</p>}

        {/* Email + OTP Verification */}
        <div className="phone-otp-section">
          <div className="phone-input-row">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailVerified) {
                  setEmailVerified(false)
                  setEmailOtpSent(false)
                  setEmailOtp("")
                }
              }}
              disabled={emailVerified}
              className={emailVerified ? "verified-input" : ""}
            />
            {!emailVerified && (
              <button
                type="button"
                className="otp-send-btn"
                onClick={handleSendEmailOTP}
                disabled={emailOtpLoading || emailCountdown > 0}
              >
                {emailOtpLoading ? "Sending..." : emailCountdown > 0 ? `Resend (${emailCountdown}s)` : emailOtpSent ? "Resend" : "Verify"}
              </button>
            )}
            {emailVerified && <span className="verified-badge">✅</span>}
          </div>

          {emailOtpSent && !emailVerified && (
            <div className="otp-verify-row">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-input"
              />
              <button
                type="button"
                className="otp-verify-btn"
                onClick={handleVerifyEmailOTP}
                disabled={emailOtpLoading}
              >
                {emailOtpLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {emailOtpMessage && (
            <p className={`otp-message ${emailVerified ? "success" : ""}`}>{emailOtpMessage}</p>
          )}
          {error.email && <p className="error-text">{error.email}</p>}
          {error.emailOtp && <p className="error-text">{error.emailOtp}</p>}
        </div>

        {/* Phone + OTP Verification */}
        <div className="phone-otp-section">
          <div className="phone-input-row">
            <input
              type="tel"
              placeholder="Phone Number (e.g. 9876543210)"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (phoneVerified) {
                  setPhoneVerified(false)
                  setOtpSent(false)
                  setOtp("")
                }
              }}
              disabled={phoneVerified}
              className={phoneVerified ? "verified-input" : ""}
            />
            {!phoneVerified && (
              <button
                type="button"
                className="otp-send-btn"
                onClick={handleSendOTP}
                disabled={otpLoading || otpCountdown > 0}
              >
                {otpLoading ? "Sending..." : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            )}
            {phoneVerified && <span className="verified-badge">✅</span>}
          </div>

          {otpSent && !phoneVerified && (
            <div className="otp-verify-row">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-input"
              />
              <button
                type="button"
                className="otp-verify-btn"
                onClick={handleVerifyOTP}
                disabled={otpLoading}
              >
                {otpLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {otpMessage && (
            <p className={`otp-message ${phoneVerified ? "success" : ""}`}>{otpMessage}</p>
          )}
          {error.phone && <p className="error-text">{error.phone}</p>}
          {error.otp && <p className="error-text">{error.otp}</p>}
        </div>

        {/* Password */}
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error.password && <p className="error-text">{error.password}</p>}

        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error.confirmPassword && <p className="error-text">{error.confirmPassword}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing Up..." : "Sign Up"}
        </button>

        <p className="login-link">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        <div className="social-divider">
          <span>or continue with</span>
        </div>

        <div className="social-login-buttons">
          <button type="button" className="social-btn google-btn" onClick={() => alert('Google login coming soon!')}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button type="button" className="social-btn facebook-btn" onClick={() => alert('Facebook login coming soon!')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>
      </form>
    </div>
  )
}

export default Registration
