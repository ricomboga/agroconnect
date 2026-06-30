-- AlterEnum: add 'cancelled' to LoanStatus
-- PostgreSQL enums are ordered; new value is inserted before repaid/defaulted
ALTER TYPE "LoanStatus" ADD VALUE IF NOT EXISTS 'cancelled' BEFORE 'repaid';
