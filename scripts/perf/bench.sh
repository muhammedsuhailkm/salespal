#!/bin/zsh
# Times every main page per role (cold + warm) and records response size.
# Start a production build against the perf database first:
#   npx next build && DATABASE_URL="postgresql://USER@localhost:5432/salespal_perf?schema=public" npx next start -p 3100
# Usage: scripts/perf/bench.sh <label>   → writes scripts/perf/results-<label>.tsv
cd "$(dirname "$0")"
B=http://localhost:3100
login() { rm -f $1.jar; csrf=$(curl -s -c $1.jar $B/api/auth/csrf | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])'); curl -s -b $1.jar -c $1.jar -o /dev/null -X POST $B/api/auth/callback/credentials --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$2" --data-urlencode "password=password123"; }
login owner owner@salespal.test; login mgr manager.a@salespal.test; login sm omar@salespal.test; login acct accountant@salespal.test
OUT=results-$1.tsv; : > $OUT
run() { # jar path
  for pass in cold warm; do
    r=$(curl -s -o body.tmp -b $1.jar -w "%{http_code}\t%{time_total}\t%{size_download}" "$B$2")
    [ $pass = cold ] && c=$r || w=$r
  done
  printf "%s\t%s\t%s\t%s\n" "$1" "$2" "$(echo $c | cut -f1-3)" "$(echo $w | cut -f2)" >> $OUT
}
for p in /dashboard/admin /dashboard/admin/clients /dashboard/admin/companies /dashboard/admin/enquiries /dashboard/admin/salesmen /dashboard/admin/reports /dashboard/admin/users; do run owner $p; done
for p in /dashboard/manager /dashboard/manager/clients /dashboard/manager/enquiries /dashboard/manager/orders /dashboard/manager/tasks /dashboard/manager/team; do run mgr $p; done
for p in /dashboard/salesman /dashboard/salesman/dashboard-org /dashboard/salesman/clients /dashboard/salesman/enquiries /dashboard/salesman/orders /dashboard/salesman/tasks /api/orders /api/enquiries; do run sm $p; done
for p in /dashboard/accountant /dashboard/accountant/enquiries /dashboard/accountant/orders /dashboard/accountant/shipping-rates; do run acct $p; done
printf "%-6s %-36s %4s %8s %8s %9s\n" role path code cold_s warm_s size_KB
awk -F'\t' '{printf "%-6s %-36s %4s %8.2f %8.2f %9.0f\n",$1,$2,$3,$4,$6,$5/1024}' $OUT
