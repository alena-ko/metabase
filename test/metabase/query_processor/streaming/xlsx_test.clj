(ns metabase.query-processor.streaming.xlsx-test
  (:require [cheshire.generate :as generate]
            [clojure.test :refer :all]
            [dk.ative.docjure.spreadsheet :as spreadsheet]
            [metabase.query-processor.streaming.interface :as i]
            [metabase.query-processor.streaming.xlsx :as xlsx]
            [metabase.shared.models.visualization-settings :as mb.viz])
  (:import com.fasterxml.jackson.core.JsonGenerator
           [java.io BufferedInputStream BufferedOutputStream ByteArrayInputStream ByteArrayOutputStream]))

;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                     Format string generation unit tests                                        |
;;; +----------------------------------------------------------------------------------------------------------------+

(defn- format-string
  [format-settings]
  (let [format-strings (@#'xlsx/format-settings->format-strings format-settings)]
    ;; If only one format string is returned (for datetimes) or both format strings
    ;; are equal, just return a single value to make tests more readable.
    (cond
      (= (count format-strings) 1)
      (first format-strings)

      (= (first format-strings) (second format-strings))
      (first format-strings)

      :else
      format-strings)))

(deftest format-settings->format-string-test
  (testing "Empty format settings don't produce a format string"
    (is (nil? (format-string {}))))

  (testing "General number formatting"
    (testing "number-style (non-currency)"
      (is (= ["#,##0" "#,##0.##"] (format-string {::mb.viz/number-style "decimal"})))
      (is (= "#,##0.00%"   (format-string {::mb.viz/number-style "percent"})))
      (is (= "#,##0.00E+0" (format-string {::mb.viz/number-style "scientific"}))))

    (testing "Decimals"
      (is (= "#,##0"     (format-string {::mb.viz/decimals 0, ::mb.viz/number-style "decimal"})))
      (is (= "#,##0%"    (format-string {::mb.viz/decimals 0, ::mb.viz/number-style "percent"})))
      (is (= "#,##0E+0"  (format-string {::mb.viz/decimals 0, ::mb.viz/number-style "scientific"})))
      (is (= "[$$]#,##0" (format-string {::mb.viz/decimals 0,
                                         ::mb.viz/currency-in-header false,
                                         ::mb.viz/number-style "currency"})))
      (is (= "#,##0.000"     (format-string {::mb.viz/decimals 3, ::mb.viz/number-style "decimal"})))
      (is (= "#,##0.000%"    (format-string {::mb.viz/decimals 3, ::mb.viz/number-style "percent"})))
      (is (= "#,##0.000E+0"  (format-string {::mb.viz/decimals 3, ::mb.viz/number-style "scientific"})))
      (is (= "[$$]#,##0.000" (format-string {::mb.viz/decimals 3,
                                             ::mb.viz/currency-in-header false,
                                             ::mb.viz/number-style "currency"})))
      ;; Negative decimal values not supported (unlike on frontend); falls back to 0
      (is (= "#,##0"     (format-string {::mb.viz/decimals -1, ::mb.viz/number-style "decimal"})))
      (is (= "#,##0%"    (format-string {::mb.viz/decimals -1, ::mb.viz/number-style "percent"})))
      (is (= "#,##0E+0"  (format-string {::mb.viz/decimals -1, ::mb.viz/number-style "scientific"})))
      (is (= "[$$]#,##0" (format-string {::mb.viz/decimals -1,
                                         ::mb.viz/currency-in-header false,
                                         ::mb.viz/number-style "currency"}))))

    (testing "Scale"
      ;; Scale should not affect format string since it is applied to the actual data prior to export
      (is (= ["#,##0" "#,##0.##"] (format-string {::mb.viz/scale 2})))
      (is (= "#,##0.00"           (format-string {::mb.viz/scale 2, ::mb.viz/decimals 2}))))

    (testing "Prefix and suffix"
      ;; Prefix/suffix on general number format
      (is (= ["\"prefix\"#,##0"
              "\"prefix\"#,##0.##"]             (format-string {::mb.viz/prefix "prefix"})))
      (is (= ["#,##0\"suffix\""
              "#,##0.##\"suffix\""]             (format-string {::mb.viz/suffix "suffix"})))
      (is (= ["\"prefix\"#,##0\"suffix\""
              "\"prefix\"#,##0.##\"suffix\""]   (format-string {::mb.viz/prefix "prefix",
                                                                ::mb.viz/suffix "suffix"})))
      ;; Prefix/suffix on number format w/fixed decimal count
      (is (= "\"prefix\"#,##0.00"               (format-string {::mb.viz/decimals 2,
                                                                ::mb.viz/prefix "prefix"})))
      (is (= "#,##0.00\"suffix\""               (format-string {::mb.viz/decimals 2,
                                                                ::mb.viz/suffix "suffix"})))
      (is (= "\"prefix\"#,##0.00\"suffix\""     (format-string {::mb.viz/decimals 2,
                                                                ::mb.viz/prefix "prefix",
                                                                ::mb.viz/suffix "suffix"})))
      ;; Prefix/suffix on percentage
      (is (= "\"prefix\"#,##0.00%\"suffix\""    (format-string {::mb.viz/number-style "percent",
                                                                ::mb.viz/prefix "prefix",
                                                                ::mb.viz/suffix "suffix"})))
      ;; Prefix/suffix on scientific notation
      (is (= "\"prefix\"#,##0.00E+0\"suffix\""  (format-string {::mb.viz/number-style "scientific",
                                                                ::mb.viz/prefix "prefix",
                                                                ::mb.viz/suffix "suffix"})))
      ;; Prefix/suffix on currency
      (is (= "\"prefix\"[$$]#,##0.00\"suffix\"" (format-string {::mb.viz/currency-in-header false,
                                                                ::mb.viz/number-style "currency",
                                                                ::mb.viz/prefix "prefix",
                                                                ::mb.viz/suffix "suffix"})))))

  (testing "Currency formatting"
    (testing "Default currency formatting is dollar sign"
      (is (= "[$$]#,##0.00" (format-string {::mb.viz/currency-in-header false}))))

    (testing "Uses native currency symbol if supported"
      (is (= "[$$]#,##0.00"   (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency "USD"})))
      (is (= "[$CA$]#,##0.00" (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency "CAD"})))
      (is (= "[$€]#,##0.00"   (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency "EUR"})))
      (is (= "[$¥]#,##0.00"   (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency "JPY"}))))

    (testing "Falls back to code if native symbol not supported"
      (is (= "[$KGS] #,##0.00" (format-string {::mb.viz/currency-in-header false,
                                               ::mb.viz/currency "KGS"})))
      (is (= "[$KGS] #,##0.00" (format-string {::mb.viz/currency-in-header false,
                                               ::mb.viz/currency "KGS",
                                               ::mb.viz/currency-style "symbol"}))))

    (testing "Respects currency-style option"
      (is (= "[$$]#,##0.00"            (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency-style "symbol"})))
      (is (= "[$USD] #,##0.00"         (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency-style "code"})))
      (is (= "#,##0.00\" US dollars\"" (format-string {::mb.viz/currency-in-header false, ::mb.viz/currency-style "name"})))
      (is (= "[$€]#,##0.00"            (format-string {::mb.viz/currency-in-header false,
                                                       ::mb.viz/currency "EUR",
                                                       ::mb.viz/currency-style "symbol"})))
      (is (= "[$EUR] #,##0.00"         (format-string {::mb.viz/currency-in-header false,
                                                       ::mb.viz/currency "EUR",
                                                       ::mb.viz/currency-style "code"})))
      (is (= "#,##0.00\" euros\""      (format-string {::mb.viz/currency-in-header false,
                                                       ::mb.viz/currency "EUR",
                                                       ::mb.viz/currency-style "name"}))))

    (testing "Formatting options are ignored if currency-in-header is true or absent (defaults to true)"
      (is (= "#,##0.00" (format-string {::mb.viz/currency-style "symbol"})))
      (is (= "#,##0.00" (format-string {::mb.viz/currency-style "name"})))
      (is (= "#,##0.00" (format-string {::mb.viz/currency-style "code"})))
      (is (= "#,##0.00" (format-string {::mb.viz/currency "USD"})))
      (is (= "#,##0.00" (format-string {::mb.viz/currency "EUR"})))
      (is (= "#,##0.00" (format-string {::currency-in-header true, ::mb.viz/currency-style "symbol"})))
      (is (= "#,##0.00" (format-string {::currency-in-header true, ::mb.viz/currency-style "name"})))
      (is (= "#,##0.00" (format-string {::currency-in-header true, ::mb.viz/currency-style "code"})))
      (is (= "#,##0.00" (format-string {::currency-in-header true, ::mb.viz/currency "USD"})))
      (is (= "#,##0.00" (format-string {::currency-in-header true, ::mb.viz/currency "EUR"})))))

  (testing "Datetime formatting"
    (testing "date-style"
      (is (= "m/d/yyyy, h:mm am/pm"           (format-string {::mb.viz/date-style "M/D/YYYY"})))
      (is (= "d/m/yyyy, h:mm am/pm"           (format-string {::mb.viz/date-style "D/M/YYYY"})))
      (is (= "yyyy/m/d, h:mm am/pm"           (format-string {::mb.viz/date-style "YYYY/M/D"})))
      (is (= "mmmm d, yyyy, h:mm am/pm"       (format-string {::mb.viz/date-style "MMMM D, YYYY"})))
      (is (= "dmmmm, yyyy, h:mm am/pm"        (format-string {::mb.viz/date-style "DMMMM, YYYY"})))
      (is (= "dddd, mmmm d, yyyy, h:mm am/pm" (format-string {::mb.viz/date-style "dddd, MMMM D, YYYY"}))))

    (testing "date-separator"
      (is (= "m/d/yyyy, h:mm am/pm" (format-string {::mb.viz/date-style "M/D/YYYY", ::mb.viz/date-separator "/"})))
      (is (= "m.d.yyyy, h:mm am/pm" (format-string {::mb.viz/date-style "M/D/YYYY", ::mb.viz/date-separator "."})))
      (is (= "m-d-yyyy, h:mm am/pm" (format-string {::mb.viz/date-style "M/D/YYYY", ::mb.viz/date-separator "-"}))))

    (testing "date-abbreviate"
      (is (= "mmm d, yyyy, h:mm am/pm"        (format-string {::mb.viz/date-abbreviate true})))
      (is (= "mmmm d, yyyy, h:mm am/pm"       (format-string {::mb.viz/date-abbreviate false})))
      (is (= "ddd, mmm d, yyyy, h:mm am/pm"   (format-string {::mb.viz/date-abbreviate true
                                                              ::mb.viz/date-style, "dddd, MMMM D, YYYY"})))
      (is (= "dddd, mmmm d, yyyy, h:mm am/pm" (format-string {::mb.viz/date-abbreviate false
                                                              ::mb.viz/date-style, "dddd, MMMM D, YYYY"}))))

    (testing "time-style"
      (is (= "mmmm d, yyyy, hh:mm"      (format-string {::mb.viz/time-style "HH:mm"})))
      (is (= "mmmm d, yyyy, h:mm am/pm" (format-string {::mb.viz/time-style "h:mm A"})))
      (is (= "mmmm d, yyyy, h am/pm"    (format-string {::mb.viz/time-style "h A"}))))

    (testing "time-enabled"
      (is (= "mmmm d, yyyy"                    (format-string {::mb.viz/time-enabled nil})))
      (is (= "mmmm d, yyyy, h:mm am/pm"        (format-string {::mb.viz/time-enabled "minutes"})))
      (is (= "mmmm d, yyyy, h:mm:ss am/pm"     (format-string {::mb.viz/time-enabled "seconds"})))
      (is (= "mmmm d, yyyy, h:mm:ss.000 am/pm" (format-string {::mb.viz/time-enabled "milliseconds"})))
      ;; time-enabled overrides time-styled
      (is (= "mmmm d, yyyy"                    (format-string {::mb.viz/time-style "h:mm A", ::mb.viz/time-enabled nil}))))

    (testing "misc combinations"
      (is (= "yyyy.m.d, h:mm:ss am/pm"          (format-string {::mb.viz/date-style "YYYY/M/D",
                                                                ::mb.viz/date-separator ".",
                                                                ::mb.viz/time-style "h:mm A",
                                                                ::mb.viz/time-enabled "seconds"})))
      (is (= "dddd, mmmm d, yyyy, hh:mm:ss.000" (format-string {::mb.viz/date-style "dddd, MMMM D, YYYY",
                                                                ::mb.viz/time-style "HH:mm",
                                                                ::mb.viz/time-enabled "milliseconds"}))))))

;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                               XLSX export tests                                                |
;;; +----------------------------------------------------------------------------------------------------------------+

(defn- parse-xlsx-result
  [^BufferedInputStream is]
  (let [workbook (spreadsheet/load-workbook-from-stream is)
        sheet    (spreadsheet/select-sheet "Query result" workbook)]
    (for [row (spreadsheet/into-seq sheet)]
      (map spreadsheet/read-cell row))))

(defn- xlsx-export
  [ordered-cols viz-settings rows]
  (with-open [bos (ByteArrayOutputStream.)
              os  (BufferedOutputStream. bos)]
    (let [results-writer (i/streaming-results-writer :xlsx os)]
      (i/begin! results-writer {:data {:ordered-cols ordered-cols}} viz-settings)
      (doall (map-indexed
              (fn [i row] (i/write-row! results-writer row i ordered-cols viz-settings))
              rows))
      (i/finish! results-writer {:row_count (count rows)}))
    (let [bytea (.toByteArray bos)]
      (with-open [is (BufferedInputStream. (ByteArrayInputStream. bytea))]
        (parse-xlsx-result is)))))

(deftest column-order-test
  (testing "Column titles are ordered correctly in the output"
    (is (= ["Col1" "Col2"]
           (first (xlsx-export [{:id 0, :name "Col1"} {:id 1, :name "Col2"}] {} []))))
    (is (= ["Col2" "Col1"]
           (first (xlsx-export [{:id 0, :name "Col2"} {:id 1, :name "Col1"}] {} [])))))

  (testing "Data in each row is reordered by output-order prior to export"
    (is (= [["b" "a"] ["d" "c"]]
           (rest (xlsx-export [{:id 0, :name "Col1"} {:id 1, :name "Col2"}]
                              {:output-order [1 0]}
                              [["a" "b"] ["c" "d"]])))))

  (testing "Rows not included by index in output-order are excluded from export"
    (is (= [["b"] ["d"]]
           (rest (xlsx-export [{:id 0, :name "Col1"} {:id 1, :name "Col2"}]
                              {:output-order [1]}
                              [["a" "b"] ["c" "d"]]))))))

(deftest column-title-test
  (testing "::mb.viz/column-title precedence over :display_name, which takes precendence over :name"
    (is (= ["Display name"]
           (first (xlsx-export [{:id 0, :display_name "Display name", :name "Name"}] {} []))))
    (is (= ["Column title"]
           (first (xlsx-export [{:id 0, :display_name "Display name", :name "Name"}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0} {::mb.viz/column-title "Column title"}}}
                               []))))
    ;; Columns can be correlated to viz settings by :name if :id is missing (e.g. for native queries)
    (is (= ["Column title"]
           (first (xlsx-export [{:display_name "Display name", :name "Name"}]
                               {::mb.viz/column-settings {{::mb.viz/column-name "Name"} {::mb.viz/column-title "Column title"}}}
                               [])))))

  (testing "Currency is included in column title if necessary"
    ;; Dollar symbol is included by default if semantic type of column derives from :type/Currency
    (is (= ["Col ($)"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {::mb.viz/field-id 0}}
                               []))))
    ;; Currency code is used if requested in viz settings
    (is (= ["Col (USD)"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0}
                                                          {::mb.viz/currency "USD",
                                                           ::mb.viz/currency-style "code"}}}
                               []))))
    ;; Currency name is used if requested in viz settings
    (is (= ["Col (US dollars)"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0}
                                                          {::mb.viz/currency "USD",
                                                           ::mb.viz/currency-style "name"}}}
                               []))))
    ;; Currency type from viz settings is respected
    (is (= ["Col (€)"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0} {::mb.viz/currency "EUR"}}}
                               []))))
    ;; Falls back to code if native symbol is not supported
    (is (= ["Col (KGS)"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0}
                                                          {::mb.viz/currency "KGS", ::mb.viz/currency-style "symbol"}}}
                               []))))
    ;; Currency not included unless semantic type of column derives from :type/Currency
    (is (= ["Col"]
           (first (xlsx-export [{:id 0, :name "Col"}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0} {::mb.viz/currency "USD"}}}
                               []))))
    ;; Currency not included if ::mb.viz/currency-in-header is false
    (is (= ["Col"]
           (first (xlsx-export [{:id 0, :name "Col", :semantic_type :type/Cost}]
                               {::mb.viz/column-settings {{::mb.viz/field-id 0}
                                                          {::mb.viz/currency "USD",
                                                           ::mb.viz/currency-style "code",
                                                           ::mb.viz/currency-in-header false}}}
                               []))))))

(deftest scale-test
  (testing "scale is applied to data prior to export"
    (is (= [2.0]
           (second (xlsx-export [{:id 0, :name "Col"}]
                                {::mb.viz/column-settings {{::mb.viz/field-id 0} {::mb.viz/scale 2}}}
                                [[1.0]]))))))

(deftest misc-data-test
  (testing "Boolean values are exported correctly"
    (is (= [[true] [false]]
           (rest (xlsx-export [{:id 0, :name "Col"}] {} [[true] [false]])))))
  (testing "nil values are exported correctly"
    (is (= [nil]
           (second (xlsx-export [{:id 0, :name "Col"}] {} [[nil]])))))
  (testing "numbers that round to ints are exported correctly"
    (is (= [2.00001]
           (second (xlsx-export [{:id 0, :name "Col"}] {} [[2.00001]])))))
  (testing "numbers that do not round to ints are exported correctly"
    (is (= [123.123]
           (second (xlsx-export [{:id 0, :name "Col"}] {} [[123.123]]))))))


(defrecord ^:private SampleNastyClass [^String v])

(generate/add-encoder
 SampleNastyClass
 (fn [obj, ^JsonGenerator json-generator]
   (.writeString json-generator (str (:v obj)))))

(defrecord ^:private AnotherNastyClass [^String v])

(deftest encode-strange-classes-test
  (testing (str "Make sure that we're piggybacking off of the JSON encoding logic when encoding strange values in "
                "XLSX (#5145, #5220, #5459)")
    (is (= ["Hello XLSX World!" "{:v \"No Encoder\"}"]
           (second (xlsx-export [{:name "val1"} {:name "val2"}]
                                {}
                                [[(SampleNastyClass. "Hello XLSX World!") (AnotherNastyClass. "No Encoder")]]))))))
